import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// For local dev, run `vercel dev` (runs both frontend + API routes together),
// or set VITE_API_URL in .env.local to point to a Vercel preview deployment.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
})
