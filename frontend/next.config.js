/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    API_URL: process.env.API_URL || 'http://45.77.233.102:8003',
  },
}

module.exports = nextConfig
