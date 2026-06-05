import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from the domain root everywhere now (Cloudflare Pages in prod,
  // wrangler/vite locally). The old '/gallery/' base was only for GitHub Pages.
  base: '/',
})