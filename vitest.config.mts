import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/.claude/**',
      '**/dist/**',
      'tests/e2e/**',
      '**/*.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
        'src/types/**',
        'src/emails/**',
        '**/*.d.ts',
      ],
      thresholds: {
        'src/lib/gst.ts': { lines: 80, branches: 80, functions: 80 },
        'src/lib/money.ts': { lines: 80, functions: 80 },
        'src/lib/resolveAuth.ts': { lines: 80, functions: 80 },
        'src/middleware.ts': { lines: 80 },
        'src/lib/tenantCache.ts': { lines: 80, functions: 100 },
        'src/app/api/webhooks/stripe/route.ts': { lines: 80 },
        'src/app/api/webhooks/stripe/billing/route.ts': { lines: 80 },
        'src/lib/xero/sync.ts': { lines: 80 },
      },
    },
  },
})
