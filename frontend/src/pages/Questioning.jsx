import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Questioning({ session }) {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('Beginner');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Lưu vào bảng user_onboarding
    const { error } = await supabase
      .from('user_onboarding')
      .insert([
        {
          user_id: session?.user?.id,
          goal: goal,
          experience: experience
        }
      ]);

    setLoading(false);

    if (error) {
      alert('Lỗi lưu dữ liệu: ' + error.message);
    } else {
      // Lưu xong thì chuyển vào Dashboard
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    navigate('/dashboard'); // Nút Skip bỏ qua lưu và vào thẳng Dashboard
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-center text-gray-800">Chào mừng bạn!</h1>
        <p className="mb-6 text-center text-gray-600">Hãy cho chúng tôi biết thêm về bạn nhé.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Mục tiêu của bạn là gì?</label>
            <input
              type="text"
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Ví dụ: Quản lý công việc..."
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Kinh nghiệm của bạn</label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full p-2 border rounded"
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
              className="w-full p-2 text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              {loading ? 'Đang lưu...' : 'Lưu và Tiếp tục'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full p-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
            >
              Bỏ qua (Skip)

            </button>
          </div>
        </form>
      </div>
    </div>
  );
}






