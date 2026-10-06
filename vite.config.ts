import { defineConfig } from 'vitest/config'
import copy from 'rollup-plugin-copy'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '',
  build: {
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  plugins: [
    vue(),
    copy({
      targets: [
        { src: 'public/fonts/*', dest: 'dist/assets/fonts' },
      ],
      verbose: true,
      hook: 'writeBundle',
      apply: 'build',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    exclude: ['src/tests/sum.test.ts', 'src/tests/sum.test.js'],
  },
  server: {
    https: {
      key: fs.readFileSync('./private.key'),
      cert: fs.readFileSync('./cert.pem'),
    },
    proxy: {
      '/requests.json': {
        target: 'https://dev2.smartbusinessclub.ru/timofei/b24_iw2sts_bitrix24_ru/requests.json',
        changeOrigin: true,
        secure: false,
      },
    },
    host: '127.0.0.1',
    port: 5173,
  },
})
