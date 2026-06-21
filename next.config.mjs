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
  // The blog reads .mdx files from content/blog at request time (pages render
  // dynamically because of the CSP nonce). Vercel only bundles files it can trace
  // statically, so explicitly include the content dir or the reads 404 in prod.
  outputFileTracingIncludes: {
    '/blog': ['./content/blog/**/*'],
    '/blog/[slug]': ['./content/blog/**/*'],
    '/blog/[slug]/opengraph-image': ['./content/blog/**/*'],
    '/sitemap.xml': ['./content/blog/**/*'],
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
