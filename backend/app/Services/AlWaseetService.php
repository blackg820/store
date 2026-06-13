<?php

/**
 * ============================================================
 * File     : AlWaseetService.php
 * Path     : app/Services/AlWaseetService.php
 * Purpose  : Core HTTP client that wraps every Al-Waseet
 *            Merchant API endpoint for a single store.
 *
 * This class is store-scoped — one instance per Store model.
 * Never instantiate it directly; always use AlWaseetManager:
 *
 *   $service = app(AlWaseetManager::class)->for($store);
 *
 * What this class does:
 *   - Manages the per-store login token (auto-fetch, DB cache,
 *     auto-clear on auth error)
 *   - Sends all HTTP requests to api.alwaseet-iq.net
 *   - Unwraps the API envelope { status, errNum, msg, data }
 *     and throws a RuntimeException on any API-level error
 *   - Retries failed requests twice before giving up
 *
 * Covered endpoints:
 *   1.  login()                         POST   /login
 *   2.  getCities()                     GET    /citys
 *   3.  getRegions(cityId)              GET    /regions
 *   4.  getPackageSizes()               GET    /package-sizes
 *   5.  createOrder(payload)            POST   /create-order
 *   6.  editOrder(payload)              POST   /edit-order
 *   7.  getOrders()                     GET    /merchant-orders
 *   8.  getOrderStatuses()              GET    /statuses
 *   9.  getOrdersByIds(ids)             POST   /get-orders-by-ids-bulk
 *   10. getMerchantInvoices()           GET    /get_merchant_invoices
 *   11. getInvoiceOrders(invoiceId)     GET    /get_merchant_invoice_orders
 *   12. receiveInvoice(invoiceId)       GET    /receive_merchant_invoice
 * ============================================================
 */

declare(strict_types=1);

namespace App\Services;

use App\Models\Store;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

final class AlWaseetService
{
    private const BASE_URL  = 'https://api.alwaseet-iq.net/v1/merchant';
    private const TOKEN_TTL = 60 * 60 * 12; // 12 hours in seconds

    public function __construct(
        private readonly Store $store
    ) {
        if (! $this->store->hasAlWaseetCredentials()) {
            throw new RuntimeException(
                "Store [{$this->store->id}] has no Al-Waseet credentials configured."
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  1. Authentication
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Sends username + password to Al-Waseet and persists the returned
     * token on the store record.
     *
     * You should not need to call this directly — getToken() calls it
     * automatically whenever the cached token is missing or expired.
     */
    public function login(): string
    {
        $response = $this->client()
            ->asMultipart()
            ->post(self::BASE_URL . '/login', [
                ['name' => 'username', 'contents' => $this->store->alwaseet_username],
                ['name' => 'password', 'contents' => $this->store->alwaseet_password],
            ]);

        $data  = $this->unwrap($response);
        $token = $data['token'] ?? throw new RuntimeException('Login succeeded but no token returned.');

        $this->store->storeAlWaseetToken($token, self::TOKEN_TTL);

        Log::info("AlWaseet: new token stored for store [{$this->store->id}]");

        return $token;
    }

    /**
     * Returns the store's cached token if it is still valid.
     * Otherwise calls login() to fetch and cache a fresh one.
     *
     * This is called automatically before every authenticated request.
     */
    public function getToken(): string
    {
        if ($this->store->hasValidAlWaseetToken()) {
            return $this->store->alwaseet_token;
        }

        return $this->login();
    }

    /**
     * Wipes the store's cached token.
     * Call this after updating the store's Al-Waseet password so the
     * next request forces a fresh login with the new credentials.
     */
    public function forgetToken(): void
    {
        $this->store->clearAlWaseetToken();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  2. Supplementary Data  (cities, regions, package sizes)
    //     These must be fetched before creating an order because the
    //     create-order endpoint requires their numeric IDs.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns all available delivery cities.
     * Response shape: [ { id, city_name }, … ]
     */
    public function getCities(): array
    {
        return $this->unwrap(
            $this->authenticatedClient()->get(self::BASE_URL . '/citys')
        );
    }

    /**
     * Returns all regions (neighbourhoods) for a given city.
     * Response shape: [ { id, region_name }, … ]
     *
     * @param int $cityId  The ID returned by getCities()
     */
    public function getRegions(int $cityId): array
    {
        return $this->unwrap(
            $this->authenticatedClient()->get(self::BASE_URL . '/regions', ['city_id' => $cityId])
        );
    }

    /**
     * Returns all available package size options.
     * Response shape: [ { id, size }, … ]
     */
    public function getPackageSizes(): array
    {
        return $this->unwrap(
            $this->authenticatedClient()->get(self::BASE_URL . '/package-sizes')
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  3. Order Creation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates a new delivery order and returns the full order data
     * including qr_id (order identifier) and qr_link (printable receipt PDF).
     *
     * Required keys in $payload:
     *   client_name, client_mobile (+9647XXXXXXXXX), city_id, region_id,
     *   location, type_name, items_number, price, package_size, replacement (0|1)
     *
     * Optional keys: client_mobile2, merchant_notes
     */
    public function createOrder(array $payload): array
    {
        $this->assertRequiredKeys([
            'client_name', 'client_mobile', 'city_id', 'region_id',
            'location', 'type_name', 'items_number', 'price',
            'package_size', 'replacement',
        ], $payload, __FUNCTION__);

        return $this->unwrap(
            $this->authenticatedClient()
                ->asMultipart()
                ->post(self::BASE_URL . '/create-order', $this->toMultipart($payload))
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  4. Edit an Order
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Updates an existing order.
     * Only works while the order is still at the merchant's possession.
     *
     * Required keys: qr_id  +  all keys from createOrder()
     */
    public function editOrder(array $payload): array
    {
        $this->assertRequiredKeys([
            'qr_id', 'client_name', 'client_mobile', 'city_id', 'region_id',
            'location', 'type_name', 'items_number', 'price',
            'package_size', 'replacement',
        ], $payload, __FUNCTION__);

        return $this->unwrap(
            $this->authenticatedClient()
                ->asMultipart()
                ->post(self::BASE_URL . '/edit-order', $this->toMultipart($payload))
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  5. Retrieve All Orders
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns every order that belongs to this store's merchant account,
     * along with current status, pricing breakdown, and invoice linkage.
     */
    public function getOrders(): array
    {
        return $this->unwrap(
            $this->authenticatedClient()->get(self::BASE_URL . '/merchant-orders')
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  6. Order Statuses
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns the full list of possible order status codes and their
     * Arabic description texts.
     * Response shape: [ { id, status }, … ]
     */
    public function getOrderStatuses(): array
    {
        return $this->unwrap(
            $this->authenticatedClient()->get(self::BASE_URL . '/statuses')
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  7. Retrieve Specific Orders by IDs  (batch)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Fetches up to 25 specific orders in one request.
     * IDs beyond the first 25 are silently discarded by the API;
     * this method warns in the log and truncates before sending.
     *
     * @param  int[]|string[]  $ids  Array of order IDs (qr_id values)
     */
    public function getOrdersByIds(array $ids): array
    {
        if (empty($ids)) {
            throw new RuntimeException('getOrdersByIds: $ids must not be empty.');
        }

        if (count($ids) > 25) {
            Log::warning("AlWaseet [store {$this->store->id}]: getOrdersByIds got " . count($ids) . " IDs; truncating to 25.");
            $ids = array_slice($ids, 0, 25);
        }

        return $this->unwrap(
            $this->authenticatedClient()
                ->asMultipart()
                ->post(self::BASE_URL . '/get-orders-by-ids-bulk', [
                    ['name' => 'ids', 'contents' => implode(',', $ids)],
                ])
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  8–10. Invoice Management  (⚠ requires Merchant token, not user token)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns all invoices generated for this merchant account.
     * Each invoice groups a batch of delivered orders for settlement.
     */
    public function getMerchantInvoices(): array
    {
        return $this->unwrap(
            $this->authenticatedClient()->get(self::BASE_URL . '/get_merchant_invoices')
        );
    }

    /**
     * Returns the invoice header + every order inside a specific invoice.
     *
     * @param int|string $invoiceId  The invoice ID from getMerchantInvoices()
     */
    public function getInvoiceOrders(int|string $invoiceId): array
    {
        return $this->unwrap(
            $this->authenticatedClient()->get(self::BASE_URL . '/get_merchant_invoice_orders', [
                'invoice_id' => $invoiceId,
            ])
        );
    }

    /**
     * Marks an invoice as received by the merchant.
     * Normally done by scanning the invoice QR code in the merchant app;
     * this endpoint provides the same action programmatically.
     *
     * @param int|string $invoiceId  The invoice ID to confirm
     */
    public function receiveInvoice(int|string $invoiceId): array
    {
        return $this->unwrap(
            $this->authenticatedClient()->get(self::BASE_URL . '/receive_merchant_invoice', [
                'invoice_id' => $invoiceId,
            ])
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Base HTTP client with timeout and automatic retry configured.
     * Retries twice with a 500 ms pause — does NOT throw on exhaustion
     * so the final error is surfaced by unwrap() instead.
     */
    private function client(): PendingRequest
    {
        return Http::timeout(config('services.alwaseet.timeout', 30))
            ->retry(2, 500, throw: false);
    }

    /**
     * HTTP client with the store's auth token appended as ?token=…
     * Al-Waseet uses query-param auth, not Authorization headers.
     */
    private function authenticatedClient(): PendingRequest
    {
        return $this->client()->withQueryParameters([
            'token' => $this->getToken(),
        ]);
    }

    /**
     * Decodes the response, checks the API-level `status` flag, and
     * returns `data` on success.  Throws RuntimeException on failure.
     *
     * Side-effect: if the API returns a 401/403 auth error code, it
     * automatically clears the stored token so the next request will
     * re-authenticate rather than keep replaying a stale token.
     */
    private function unwrap(Response $response): array
    {
        // Throw on HTTP 4xx / 5xx status codes
        $response->throw();

        $body = $response->json();

        if (! isset($body['status'])) {
            throw new RuntimeException('Al-Waseet API returned an unexpected response format.');
        }

        if ($body['status'] !== true) {
            $errNum  = $body['errNum'] ?? 'UNKNOWN';
            $message = $body['msg']    ?? 'An unknown API error occurred.';

            Log::error("AlWaseet [store {$this->store->id}] error [{$errNum}]: {$message}");

            // Auto-clear stale token on auth errors so next call re-logins
            if (in_array($errNum, ['401', '403', 'E001'], strict: true)) {
                $this->store->clearAlWaseetToken();
            }

            throw new RuntimeException("[AlWaseet {$errNum}] {$message}");
        }

        return $body['data'] ?? [];
    }

    /**
     * Converts a flat key=>value array into the multipart array format
     * required by Http::asMultipart()->post().
     */
    private function toMultipart(array $data): array
    {
        return array_map(
            fn ($key, $value) => ['name' => (string) $key, 'contents' => (string) $value],
            array_keys($data),
            array_values($data)
        );
    }

    /**
     * Validates that every required key is present in $payload.
     * Throws early with a clear message rather than letting the API
     * return a cryptic error for a missing field.
     */
    private function assertRequiredKeys(array $required, array $payload, string $method): void
    {
        $missing = array_diff($required, array_keys($payload));

        if (! empty($missing)) {
            throw new RuntimeException(
                "AlWaseetService::{$method} missing required fields: " . implode(', ', $missing)
            );
        }
    }
}