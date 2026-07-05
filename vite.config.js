import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base-Pfad fuer GitHub Pages: https://manoaverner-maker.github.io/aspl-rennkalender/
export default defineConfig({
  plugins: [react()],
  base: '/aspl-rennkalender/',
})
