
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,   // pin the workspace root to solv-main
  },
}

export default nextConfig