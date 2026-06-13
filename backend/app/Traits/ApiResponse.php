<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    /**
     * Success response
     *
     * @param mixed $data
     * @param string|null $message
     * @param int $code
     * @return JsonResponse
     */
    protected function success($data, ?string $message = null, int $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    /**
     * Error response
     *
     * @param string $message
     * @param int $code
     * @param mixed $errors
     * @return JsonResponse
     */
    protected function error(string $message, int $code = 400, $errors = null, ?string $appCode = null, array $extra = []): JsonResponse
    {
        $payload = [
            'success' => false,
            'code' => $appCode ?: $this->defaultErrorCode($code),
            'message' => $message,
            'errors' => $errors ?: (object) [],
            'details' => $extra['details'] ?? (object) [],
        ];

        foreach ($extra as $key => $value) {
            $payload[$key] = $value;
        }

        return response()->json($payload, $code);
    }

    protected function limitError(array $check, int $status = 403): JsonResponse
    {
        return response()->json([
            'success' => false,
            'code' => $check['code'] ?? 'PLAN_LIMIT_REACHED',
            'message' => $check['message'] ?? 'Plan limit reached.',
            'details' => $check['details'] ?? null,
            'errors' => (object) [],
            'upgrade' => $check['upgrade'] ?? null,
        ], $status);
    }

    private function defaultErrorCode(int $status): string
    {
        return match ($status) {
            401 => 'UNAUTHENTICATED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            422 => 'VALIDATION_ERROR',
            429 => 'RATE_LIMITED',
            default => $status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR',
        };
    }
}
