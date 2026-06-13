<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $blueprint) {
            $blueprint->text('bio')->nullable()->after('description');
            $blueprint->string('facebook_url')->nullable()->after('cover_url');
            $blueprint->string('instagram_url')->nullable()->after('facebook_url');
            $blueprint->string('tiktok_url')->nullable()->after('instagram_url');
            $blueprint->string('youtube_url')->nullable()->after('tiktok_url');
            $blueprint->string('twitter_url')->nullable()->after('youtube_url');
            $blueprint->string('telegram_url')->nullable()->after('twitter_url');
            $blueprint->string('snapchat_url')->nullable()->after('telegram_url');
            $blueprint->string('website_url')->nullable()->after('snapchat_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $blueprint) {
            $blueprint->dropColumn([
                'bio',
                'facebook_url',
                'instagram_url',
                'tiktok_url',
                'youtube_url',
                'twitter_url',
                'telegram_url',
                'snapchat_url',
                'website_url',
            ]);
        });
    }
};
