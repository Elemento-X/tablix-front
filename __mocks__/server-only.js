// `server-only` throws when imported outside a React Server Component context
// (e.g. in Jest). This automatic node_modules mock turns it into a no-op so we
// can unit-test server-only modules like src/lib/blog/posts.ts.
module.exports = {}
