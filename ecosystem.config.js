require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'storify-store',
      cwd: '/var/www/store',
      script: 'node',
      args: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        ...process.env
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/store-error.log',
      out_file: 'logs/store-out.log',
    },
    {
      name: 'storify-backend',
      cwd: '/var/www/store/backend',
      script: 'php',
      args: 'artisan serve --port=8000',
      instances: 1,
      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
    },
    {
      name: 'storify-worker',
      cwd: '/var/www/store/backend',
      script: 'php',
      args: 'artisan queue:work --sleep=3 --tries=3 --max-time=3600',
      instances: 1,
      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '../logs/worker-error.log',
      out_file: '../logs/worker-out.log',
    },
    {
      name: 'storify-reverb',
      cwd: '/var/www/store/backend',
      script: 'php',
      args: 'artisan reverb:start',
      instances: 1,
      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '../logs/reverb-error.log',
      out_file: '../logs/reverb-out.log',
    },
    {
      name: 'storify-scheduler',
      cwd: '/var/www/store/backend',
      script: 'php',
      args: 'artisan schedule:work',
      instances: 1,
      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '../logs/scheduler-error.log',
      out_file: '../logs/scheduler-out.log',
    }
  ]
}
