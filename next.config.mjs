import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    reactRemoveProperties:
      process.env.NODE_ENV === 'production' && !process.env.CI
        ? { properties: ['^data-testid$'] }
        : false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'posthog-js'],
  },
}

export default withSentryConfig(nextConfig, {
  // Upload source maps for readable stack traces
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Suppress noisy Sentry build logs
  silent: !process.env.CI,

  // Disable Sentry telemetry
  telemetry: false,
})
