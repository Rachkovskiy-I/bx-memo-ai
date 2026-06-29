import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev
export default defineConfig({
  plugins: [react()],
  base: '/bx-memo-ai/', // Это заставит Vite правильно прописывать пути для GitHub Pages!
})
