require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'store',
      script: '.next/standalone/server.js',
      // args: 'start', // Not needed for standalone
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        BUNNY_STORAGE_ZONE: process.env.BUNNY_STORAGE_ZONE,
        BUNNY_API_KEY: process.env.BUNNY_API_KEY,
        BUNNY_PULL_ZONE: process.env.BUNNY_PULL_ZONE,
        BUNNY_REGION: process.env.BUNNY_REGION,
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        JWT_SECRET: process.env.JWT_SECRET,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
      }
    }
  ]
}
