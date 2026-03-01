// frontend/src/App.jsx
import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

// Import components
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

import Questioning from './pages/Questioning'
import Dashboard from './pages/Dashboard'
import MainLayout from './layouts/MainLayout'

// --- CÁC TRANG TẠM THỜI (Placeholders) ---
const LandingPage = () => <div className="p-10 text-center"><h1>Landing Page</h1><a href="/login" className="text-blue-500 underline">Đăng nhập ngay</a></div>

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Lấy session hiện tại khi web vừa load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Lắng nghe sự thay đổi (đăng nhập, đăng xuất)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen">Đang tải...</div>

  return (
    <Router>
      <Routes>
        {/* Public Routes (Ai cũng vào được) */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={session ? <Navigate to="/dashboard" /> : <Login />}
        />

        {/* Protected Routes (Phải đăng nhập mới vào được) */}
        <Route
          path="/questioning"
          element={
            <ProtectedRoute session={session}>
              <Questioning session={session} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <MainLayout
                session={session}
                handleLogout={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
              />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="ai" element={<div><h2 className="text-2xl font-bold">Khu vực AI</h2><p>Giao diện chat AI sẽ nằm ở đây.</p></div>} />
          <Route path="settings" element={<h2 className="text-2xl font-bold">Cài đặt</h2>} />
          <Route path="update" element={<h2 className="text-2xl font-bold">Cập nhật hệ thống</h2>} />
          <Route path="help" element={<h2 className="text-2xl font-bold">Trung tâm Trợ giúp</h2>} />
        </Route>

        {/* Nếu gõ sai URL, đá về trang chủ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}
