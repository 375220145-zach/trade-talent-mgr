import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/trade-talent-mgr/',
  build: {
    outDir: 'docs',
  },
})
