import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Extra hostnames (e.g. a cloud preview domain) are supplied per-process through
// VITE_EXTRA_ALLOWED_HOSTS so no environment-specific host is committed here.
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
const extraHosts = (env?.VITE_EXTRA_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host: string) => host.trim())
  .filter(Boolean)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['localhost', ...extraHosts],
  },
})
