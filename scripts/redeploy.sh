#!/bin/bash

# Storify Redeploy Script
echo "🚀 Starting redeploy process..."

# Navigate to project root
cd /var/www/store

# Load environment variables if needed
# source .env

# Install dependencies if needed
# npm install

# Build the project
echo "📦 Building the project..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"

  # Restart PM2 process using ecosystem.config.js
  echo "🔄 Restarting storify-store using ecosystem.config.js..."
  pm2 restart ecosystem.config.js --only storify-store --update-env

  echo "✨ Redeploy complete! App is running on port 3001."
else
  echo "❌ Build failed. Please check the logs."
  exit 1
fi
