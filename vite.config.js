import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  // Pre-bundle heavy dependencies for faster dev server cold starts
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'react',
      'react-dom',
      'react-router-dom',
      'chart.js',
      'react-chartjs-2',
    ],
  },
  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Split vendor code into separate cacheable chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase SDK — loaded once, cached separately
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Chart library — only loaded with Dashboard
          charts: ['chart.js', 'react-chartjs-2'],
          // React core — changes rarely, cached long-term
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Icons — large but static
          icons: ['react-icons'],
        },
      },
    },
    // Enable CSS code splitting for lazy-loaded routes
    cssCodeSplit: true,
  },
})
