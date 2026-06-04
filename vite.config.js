import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Cloudflare Pages serves from the domain root; GitHub Pages serves from
  // /gallery/. CF_PAGES is set automatically during Cloudflare builds.
  base: process.env.CF_PAGES ? '/' : '/gallery/',
})