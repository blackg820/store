import { NextRequest, NextResponse } from 'next/server'

// This API endpoint handles Telegram linking
// In production, this would integrate with Telegram Bot API

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')
  const storeId = searchParams.get('store')
  const type = searchParams.get('type')

  if (!token || !storeId || !type) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  // In a real implementation:
  // 1. Validate the token against stored tokens
  // 2. Get the Telegram user/group ID from the request (sent by Telegram)
  // 3. Update the store with the Telegram ID
  // 4. Mark the token as used

  // For demo purposes, return a success page
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Telegram Linked - Storify</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          max-width: 400px;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #333;
          margin-bottom: 0.5rem;
        }
        p {
          color: #666;
        }
        .info {
          background: #f0f0f0;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1rem;
          font-size: 0.875rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>Telegram Linked!</h1>
        <p>Your Telegram ${type === 'group' ? 'group' : 'account'} has been successfully linked to your store.</p>
        <div class="info">
          <strong>Store ID:</strong> ${storeId}<br>
          <strong>Type:</strong> ${type === 'group' ? 'Group Notifications' : 'Private Notifications'}
        </div>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #999;">
          You can close this window now.
        </p>
      </div>
    </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
