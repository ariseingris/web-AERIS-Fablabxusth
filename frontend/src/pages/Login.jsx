// frontend/src/pages/Login.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const navigate = useNavigate()

    const handleSignUp = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else alert('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận (nếu có yêu cầu).')
        setLoading(false)
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setError(error.message)
        } else {
            // Thành công -> Chuyển hướng sang trang đặt câu hỏi (Questioning)
            navigate('/questioning')
        }
        setLoading(false)
    }

    const handleSocialLogin = async (provider) => {
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.signInWithOAuth({ provider })
        if (error) {
            setError(error.message)
        }
        setLoading(false)
    }

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="p-8 bg-white rounded shadow-md w-96">
                <h1 className="mb-6 text-2xl font-bold text-center">Đăng nhập / Đăng ký</h1>

                {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded">{error}</div>}

                <form className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email của bạn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                    <input
                        type="password"
                        placeholder="Mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border rounded"
                    />

                    <div className="flex space-x-2">
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                        </button>
                        <button
                            onClick={handleSignUp}
                            disabled={loading}
                            className="w-full p-2 text-blue-500 border border-blue-500 rounded hover:bg-blue-50 disabled:opacity-50"
                        >
                            Đăng ký
                        </button>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <span className="px-3 text-sm text-gray-500">Hoặc tiếp tục với</span>
                        <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            disabled={loading}
                            className="w-full p-2 font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            Google
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('twitter')}
                            disabled={loading}
                            className="w-full p-2 font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            X
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
