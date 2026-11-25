/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a production build run next to the dev server (e.g. NEXT_DIST_DIR=.next-prod)
  distDir: process.env.NEXT_DIST_DIR || '.next',
}

module.exports = nextConfig
