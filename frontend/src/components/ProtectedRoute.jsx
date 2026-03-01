// frontend/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'

// Component này sẽ bọc các trang cần bảo mật. 
// Nếu không có session (chưa đăng nhập), nó đá người dùng về trang /login
export default function ProtectedRoute({ session, children }) {
    if (!session) {
        return <Navigate to="/login" replace />
    }
    return children
}
