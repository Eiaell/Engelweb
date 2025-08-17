/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  experimental: {
    optimizeCss: true
  }
}

module.exports = nextConfig