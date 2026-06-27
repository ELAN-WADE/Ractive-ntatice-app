/**
 * Stub for @opentelemetry/api
 *
 * @supabase/supabase-js conditionally imports OpenTelemetry for server-side
 * tracing. In React Native, this package doesn't exist and Metro can't
 * resolve it. This stub satisfies the import with no-op implementations
 * so the bundle succeeds without breaking any Supabase functionality.
 *
 * Metro is pointed here via metro.config.js > resolver.extraNodeModules.
 */

const noopTracer = {
  startSpan: () => ({
    setAttribute: () => {},
    setStatus: () => {},
    end: () => {},
    recordException: () => {},
  }),
  startActiveSpan: (_name, fn) => fn({ end: () => {} }),
};

const noopMeter = {
  createCounter: () => ({ add: () => {} }),
  createHistogram: () => ({ record: () => {} }),
  createObservableGauge: () => ({}),
};

module.exports = {
  // trace API
  trace: {
    getTracer: () => noopTracer,
    getActiveSpan: () => undefined,
    setSpan: (ctx) => ctx,
    wrapSpanContext: () => ({}),
  },
  // context API
  context: {
    active: () => ({}),
    with: (_ctx, fn) => fn(),
    bind: (_ctx, fn) => fn,
  },
  // propagation API
  propagation: {
    inject: () => {},
    extract: (_ctx) => _ctx,
    fields: () => [],
  },
  // metrics API
  metrics: {
    getMeter: () => noopMeter,
  },
  // SpanStatusCode enum
  SpanStatusCode: { UNSET: 0, OK: 1, ERROR: 2 },
  // Common no-ops
  diag: {
    setLogger: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    verbose: () => {},
  },
};
