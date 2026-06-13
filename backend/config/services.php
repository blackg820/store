<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'telegram' => [
        'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET'),
    ],

    'bunny' => [
        'storage_zone' => env('BUNNY_STORAGE_ZONE'),
        'api_key' => env('BUNNY_API_KEY'),
        'pull_zone' => env('BUNNY_PULL_ZONE'),
        'region' => env('BUNNY_REGION', 'storage.bunnycdn.com'),
    ],

    'push' => [
        'fcm' => [
            'project_id' => env('PUSH_FCM_PROJECT_ID', env('FIREBASE_PROJECT_ID')),
            'service_account_path' => env('PUSH_FCM_SERVICE_ACCOUNT_PATH', env('FIREBASE_CREDENTIALS')),
            'service_account_json' => env('PUSH_FCM_SERVICE_ACCOUNT_JSON'),
        ],
        'apns' => [
            'key_id' => env('APNS_KEY_ID'),
            'team_id' => env('APNS_TEAM_ID'),
            'bundle_id' => env('APNS_BUNDLE_ID'),
            'private_key_path' => env('APNS_PRIVATE_KEY_PATH'),
            'private_key' => env('APNS_PRIVATE_KEY'),
            'environment' => env('APNS_ENV', 'production'),
        ],
    ],

];
