import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Rất quan trọng: Mở kết nối ra mạng bên ngoài container (0.0.0.0)
    port: 5173,
    watch: {
      usePolling: true // Rất cần thiết khi dùng Docker để code tự động update khi bạn lưu file
    }
  }
})