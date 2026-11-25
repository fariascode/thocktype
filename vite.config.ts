import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5280, strictPort: true, open: true },
  // the published commit (Vercel sets this at build time), shown in the footer
  define: { __COMMIT__: JSON.stringify(((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)) },
})
