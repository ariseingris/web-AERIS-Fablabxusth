import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

// Inline SVG components
const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);

const BrainIcon = () => (
    <svg xmlns="http://www.w3.org/www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /><path d="M15 13a4.5 4.5 0 0 1-3-4.5" /><path d="M9 13a4.5 4.5 0 0 0 3-4.5" /></svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);

const UploadCloudIcon = () => (
    <svg xmlns="http://www.w3.org/www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload-cloud"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" /></svg>
);

const HelpCircleIcon = () => (
    <svg xmlns="http://www.w3.org/www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-help-circle"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
);

const LogOutIcon = () => (
    <svg xmlns="http://www.w3.org/www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
);


export default function Sidebar({ session, handleLogout }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const location = useLocation();

    const navLinks = [
        { path: "/dashboard", label: "Trang chủ", icon: <HomeIcon /> },
        { path: "/dashboard/ai", label: "Trí tuệ Nhân tạo (AI)", icon: <BrainIcon /> },
        { path: "/dashboard/settings", label: "Cài đặt (Settings)", icon: <SettingsIcon /> },
        { path: "/dashboard/update", label: "Cập nhật (Update)", icon: <UploadCloudIcon /> },
        { path: "/dashboard/help", label: "Trợ giúp (Help)", icon: <HelpCircleIcon /> }
    ];

    return (
        <aside
            className={`bg-slate-800 text-white flex flex-col shadow-lg transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'}`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <div className="p-6 h-20 flex items-center border-b border-slate-700 overflow-hidden whitespace-nowrap">
                <span className={`text-xl font-bold text-blue-400 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                    My App
                </span>
                <span className={`text-xl font-bold text-blue-400 mx-auto transition-opacity duration-300 ${!isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                    M
                </span>
            </div>

            <nav className="flex-1 p-4 flex flex-col gap-2 overflow-hidden overflow-y-auto">
                {navLinks.map((link) => {
                    const isActive = location.pathname === link.path || (link.path !== '/dashboard' && location.pathname.startsWith(link.path));

                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`flex items-center p-3 rounded-lg transition-colors whitespace-nowrap group ${isActive
                                    ? 'bg-blue-600 text-white font-medium shadow-md'
                                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                }`}
                            title={!isExpanded ? link.label : ''} // Show tooltip only when collapsed
                        >
                            <span className="flex-shrink-0 flex items-center justify-center">
                                {link.icon}
                            </span>
                            <span className={`ml-4 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                {link.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className={`p-4 border-t border-slate-700 transition-all duration-300 overflow-hidden`}>
                {isExpanded && (
                    <div className="mb-3 text-sm text-slate-400 truncate px-2 font-medium">
                        {session?.user?.email || 'User'}
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className={`flex items-center justify-center w-full p-3 text-sm rounded-lg transition-colors whitespace-nowrap ${isExpanded
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
                            : 'text-slate-400 hover:bg-red-500 hover:text-white'
                        }`}
                    title={!isExpanded ? 'Đăng xuất' : ''}
                >
                    <span className="flex-shrink-0 flex items-center justify-center">
                        <LogOutIcon />
                    </span>
                    <span className={`ml-3 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                        Đăng xuất
                    </span>
                </button>
            </div>
        </aside>
    );
}