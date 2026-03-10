import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Questioning({ session }) {
  const navigate = useNavigate()
  const [goal, setGoal] = useState('')
  const [experience, setExperience] = useState('Beginner')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('user_onboarding')
      .insert([{ user_id: session?.user?.id, goal, experience }])

    setLoading(false)

    if (error) {
      alert('Lỗi lưu dữ liệu: ' + error.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-center text-gray-800">Chào mừng bạn!</h1>
        <p className="mb-6 text-center text-gray-500">Hãy cho chúng tôi biết thêm về bạn nhé.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Mục tiêu của bạn là gì?
            </label>
            <input
              type="text"
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Ví dụ: Quản lý công việc..."
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Kinh nghiệm của bạn
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="Beginner">Người mới bắt đầu</option>
              <option value="Intermediate">Đã có kinh nghiệm</option>
              <option value="Advanced">Chuyên gia</option>
            </select>
          </div>

          <div className="flex flex-col space-y-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full p-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Đang lưu...' : 'Lưu và Tiếp tục'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Bỏ qua (Skip)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}