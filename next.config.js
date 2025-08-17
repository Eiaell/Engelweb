/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/Engelweb/' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/Engelweb' : '',
  experimental: {
    optimizeCss: true
  }
}

module.exports = nextConfig