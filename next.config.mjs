/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Keep true for now — there are many components that reference
    // mock-data types which will be gradually migrated
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  serverExternalPackages: ['mysql2', 'bcryptjs'],
  async rewrites() {
    return [
      {
        source: '/api/v1/auth/:path*',
        destination: 'http://localhost:8000/api/v1/auth/:path*',
      },
      {
        source: '/api/v1/dashboard/init',
        destination: 'http://localhost:8000/api/v1/dashboard/init',
      },
      {
        source: '/api/v1/products/:path*',
        destination: 'http://localhost:8000/api/v1/products/:path*',
      },
      {
        source: '/api/v1/orders/:path*',
        destination: 'http://localhost:8000/api/v1/orders/:path*',
      },
      {
        source: '/api/v1/stores/:path*',
        destination: 'http://localhost:8000/api/v1/stores/:path*',
      },
      {
        source: '/api/v1/buyers/:path*',
        destination: 'http://localhost:8000/api/v1/buyers/:path*',
      },
      {
        source: '/api/v1/categories/:path*',
        destination: 'http://localhost:8000/api/v1/categories/:path*',
      },
      {
        source: '/api/v1/product-types/:path*',
        destination: 'http://localhost:8000/api/v1/product-types/:path*',
      },
      {
        source: '/api/v1/media/:path*',
        destination: 'http://localhost:8000/api/v1/media/:path*',
      },
      {
        source: '/api/v1/analytics/:path*',
        destination: 'http://localhost:8000/api/v1/analytics/:path*',
      },
      {
        source: '/api/v1/push/:path*',
        destination: 'http://localhost:8000/api/v1/push/:path*',
      },
      {
        source: '/api/v1/public/:path*',
        destination: 'http://localhost:8000/api/v1/public/:path*',
      },
    ]
  },
}

export default nextConfig
