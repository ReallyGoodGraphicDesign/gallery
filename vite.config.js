import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from the domain root everywhere now (Cloudflare Pages in prod,
  // wrangler/vite locally). The old '/gallery/' base was only for GitHub Pages.
  base: '/',
  // Node, not jsdom: everything under test in sheet.test.js is pure parsing
  // over the rows the sheet returns, so there's no DOM to stand up and no
  // jsdom dependency to carry. A component test would need that changed.
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})