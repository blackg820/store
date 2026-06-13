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
}

export default nextConfig
