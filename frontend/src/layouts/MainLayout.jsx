import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function MainLayout({ session, handleLogout }) {
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Thanh bên (Sidebar) */}
            <Sidebar session={session} handleLogout={handleLogout} />

            {/* Nội dung chính (Main Content) */}
            <main className="flex-1 p-8 overflow-y-auto w-full">
                <Outlet />
            </main>
        </div>
    );
}
