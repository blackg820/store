import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(req, path)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(req, path)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(req, path)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(req, path)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(req, path)
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

function corsHeaders(headers = new Headers()) {
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-Requested-With, X-Store-Id')
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

async function proxy(req: NextRequest, path: string[]) {
  const baseUrl = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_INTERNAL_API_URL ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '')
  const backendUrl = `${baseUrl}/api/v1/${path.join('/')}`
  const url = new URL(backendUrl)

  // Append query parameters
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value)
  })

  const headers = new Headers(req.headers)
  // Remove headers that might cause issues
  headers.delete('host')
  headers.delete('connection')
  headers.delete('content-length')

  try {
    let body: any = undefined
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = await req.arrayBuffer()
    }

    const res = await fetch(url.toString(), {
      method: req.method,
      headers: headers,
      body: body,
      redirect: 'manual',
    })

    const resBody = await res.arrayBuffer()

    // Copy response headers
    const resHeaders = new Headers(res.headers)
    // Avoid double compression issues
    resHeaders.delete('content-encoding')
    resHeaders.delete('content-length')

    return new NextResponse(resBody, {
      status: res.status,
      headers: corsHeaders(resHeaders),
    })
  } catch (err: any) {
    console.error('Proxy error:', err)
    return NextResponse.json({
      success: false,
      code: 'API_PROXY_ERROR',
      message: 'Backend API is unavailable.',
    }, { status: 500, headers: corsHeaders() })
  }
}
