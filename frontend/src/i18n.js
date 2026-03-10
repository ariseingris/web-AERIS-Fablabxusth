/**
 * i18n.js — Translation strings for EN and VI
 * Usage: import { t } from '../i18n'; then t('key', lang)
 */

export const translations = {
    // ── Sidebar ────────────────────────────────────────────────
    nav_dashboard: { en: 'Dashboard', vi: 'Tổng quan' },
    nav_ai: { en: 'AI Zone', vi: 'Khu vực AI' },
    nav_update: { en: 'Updates', vi: 'Cập nhật' },
    nav_settings: { en: 'Settings', vi: 'Cài đặt' },
    nav_help: { en: 'Help', vi: 'Trợ giúp' },
    nav_logout: { en: 'Log out', vi: 'Đăng xuất' },

    // ── Dashboard ──────────────────────────────────────────────
    dash_welcome: { en: 'Welcome back', vi: 'Chào mừng trở lại' },
    dash_subtitle: { en: "Here is your system overview today", vi: 'Đây là tổng quan hệ thống của bạn hôm nay' },
    dash_users: { en: 'Active Users', vi: 'Người dùng hoạt động' },
    dash_revenue: { en: 'Monthly Revenue', vi: 'Doanh thu tháng' },
    dash_tasks: { en: 'Tasks Completed', vi: 'Tác vụ hoàn thành' },
    dash_latency: { en: 'Avg Response', vi: 'Thời gian phản hồi' },
    dash_vs_prev: { en: 'vs. last month', vi: 'so với tháng trước' },
    dash_this_week: { en: 'this week', vi: 'trong tuần này' },
    dash_avg_today: { en: 'avg today', vi: 'trung bình hôm nay' },
    dash_activity: { en: 'Recent Activity', vi: 'Hoạt động gần đây' },
    dash_view_all: { en: 'View all →', vi: 'Xem tất cả →' },
    dash_health: { en: 'System Health', vi: 'Trạng thái hệ thống' },
    dash_uptime: { en: 'Uptime', vi: 'Uptime' },
    dash_all_clear: { en: 'All systems operational', vi: 'Tất cả hệ thống hoạt động bình thường' },
    dash_uptime_val: { en: '99.98% · last 30 days', vi: 'Uptime: 99.98% · 30 ngày qua' },
    dash_qa_task: { en: 'New task', vi: 'Tạo tác vụ' },
    dash_qa_ai: { en: 'Chat AI', vi: 'Chat AI' },
    dash_qa_export: { en: 'Export report', vi: 'Xuất báo cáo' },
    dash_qa_invite: { en: 'Invite member', vi: 'Mời thành viên' },

    // Activity items
    act_new_user: { en: 'New user registered: nguyenvana@gmail.com', vi: 'Người dùng mới đăng ký: nguyenvana@gmail.com' },
    act_task_done: { en: 'Task "Q1 Data Analysis" completed', vi: 'Tác vụ "Phân tích dữ liệu Q1" đã hoàn thành' },
    act_ai_reply: { en: 'AI answered 48 support requests', vi: 'AI trả lời 48 yêu cầu hỗ trợ' },
    act_update: { en: 'System updated to version v2.4.1', vi: 'Hệ thống cập nhật lên phiên bản v2.4.1' },
    act_report: { en: 'Monthly report Feb 2026 was generated', vi: 'Báo cáo tháng 2/2026 đã được tạo' },
    act_settings: { en: 'System settings were updated', vi: 'Cài đặt hệ thống đã được cập nhật' },

    // ── AI Page ────────────────────────────────────────────────
    ai_title: { en: 'AI Zone', vi: 'Khu vực AI' },
    ai_subtitle: { en: 'Smart Assistant · Powered by Verdant AI', vi: 'Trợ lý thông minh · Powered by Verdant AI' },
    ai_greeting: {
        en: 'Hello! I\'m your AI assistant. I can help you analyze data, generate reports, or answer questions about the system. What do you need today?',
        vi: 'Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp bạn phân tích dữ liệu, tạo báo cáo, hoặc trả lời câu hỏi về hệ thống. Bạn cần hỗ trợ gì hôm nay?'
    },
    ai_placeholder: { en: 'Type your question or request...', vi: 'Nhập câu hỏi hoặc yêu cầu của bạn...' },
    ai_disclaimer: { en: 'AI MAY MAKE MISTAKES · VERIFY IMPORTANT INFORMATION', vi: 'AI CÓ THỂ MẮC LỖI · KIỂM TRA THÔNG TIN QUAN TRỌNG' },
    ai_demo_reply: {
        en: 'I received your question. This is a demo UI — to connect real AI, integrate an API (OpenAI, Gemini, etc.) into the backend.',
        vi: 'Tôi đã nhận được câu hỏi của bạn. Hiện tại đây là giao diện demo — để kết nối AI thực, hãy tích hợp API (OpenAI, Gemini, v.v.) vào backend.'
    },
    ai_sug_1: { en: 'Summarize system activity today', vi: 'Tóm tắt hoạt động hệ thống hôm nay' },
    ai_sug_2: { en: 'Generate this month\'s revenue report', vi: 'Tạo báo cáo doanh thu tháng này' },
    ai_sug_3: { en: 'Analyze user trends', vi: 'Phân tích xu hướng người dùng' },
    ai_sug_4: { en: 'Suggest system optimizations', vi: 'Đề xuất tối ưu hóa hệ thống' },

    // ── Update Page ────────────────────────────────────────────
    upd_title: { en: 'Release Notes', vi: 'Nhật ký cập nhật' },
    upd_subtitle: { en: 'Version history and the latest changes', vi: 'Lịch sử phiên bản và những thay đổi mới nhất của hệ thống' },
    upd_current: { en: 'Current version:', vi: 'Phiên bản hiện tại:' },
    upd_released: { en: 'Released', vi: 'Phát hành' },
    upd_new: { en: 'New', vi: 'Mới' },
    upd_fix: { en: 'Fix', vi: 'Sửa lỗi' },
    upd_improve: { en: 'Improve', vi: 'Cải thiện' },

    // ── Settings Page ──────────────────────────────────────────
    set_title: { en: 'Settings', vi: 'Cài đặt' },
    set_subtitle: { en: 'Manage your account and preferences', vi: 'Quản lý tài khoản và tuỳ chọn của bạn' },
    set_tab_profile: { en: 'Profile', vi: 'Hồ sơ' },
    set_tab_notif: { en: 'Notifications', vi: 'Thông báo' },
    set_tab_appear: { en: 'Appearance', vi: 'Giao diện' },
    set_tab_sec: { en: 'Security', vi: 'Bảo mật' },
    set_display_name: { en: 'Display Name', vi: 'Tên hiển thị' },
    set_bio: { en: 'Bio', vi: 'Tiểu sử' },
    set_bio_hint: { en: 'Max 160 characters', vi: 'Tối đa 160 ký tự' },
    set_language: { en: 'Language', vi: 'Ngôn ngữ' },
    set_timezone: { en: 'Timezone', vi: 'Múi giờ' },
    set_save: { en: 'Save changes', vi: 'Lưu thay đổi' },
    set_saved: { en: 'Changes saved', vi: 'Đã lưu thay đổi' },
    set_notif_email: { en: 'Email Notifications', vi: 'Thông báo qua Email' },
    set_notif_push: { en: 'Push Notifications', vi: 'Thông báo đẩy (Push)' },
    set_notif_upd: { en: 'Version update alerts', vi: 'Cập nhật phiên bản mới' },
    set_notif_sec: { en: 'Security alerts', vi: 'Cảnh báo bảo mật' },
    set_theme: { en: 'Theme', vi: 'Chủ đề' },
    set_theme_dark: { en: '🌙 Dark', vi: '🌙 Tối' },
    set_theme_light: { en: '☀️ Light', vi: '☀️ Sáng' },
    set_theme_sys: { en: '💻 System', vi: '💻 Hệ thống' },
    set_compact: { en: 'Compact mode', vi: 'Chế độ compact' },
    set_animations: { en: 'Transition effects', vi: 'Hiệu ứng chuyển cảnh' },
    set_sec_pw: { en: 'Password', vi: 'Mật khẩu' },
    set_sec_pw_desc: {
        en: 'Reset your password via email. The reset link is valid for 60 minutes.',
        vi: 'Đặt lại mật khẩu qua email đã đăng ký. Liên kết đặt lại có hiệu lực trong 60 phút.'
    },
    set_sec_pw_btn: { en: 'Send password reset email', vi: 'Gửi email đặt lại mật khẩu' },
    set_sec_logout: { en: 'Log out all devices', vi: 'Đăng xuất tất cả thiết bị' },
    set_sec_logout_desc: {
        en: 'Log out of all active sessions on every device.',
        vi: 'Đăng xuất khỏi tất cả phiên đang hoạt động trên mọi thiết bị.'
    },
    set_sec_logout_btn: { en: 'Log out all devices', vi: 'Đăng xuất tất cả thiết bị' },
    set_profile_sec: { en: 'Personal Information', vi: 'Thông tin cá nhân' },

    // ── Help Page ──────────────────────────────────────────────
    help_title: { en: 'Help & Support', vi: 'Trợ giúp & Hỗ trợ' },
    help_subtitle: { en: 'Find quick answers or contact the support team', vi: 'Tìm câu trả lời nhanh hoặc liên hệ nhóm hỗ trợ' },
    help_faq_title: { en: 'Frequently Asked Questions', vi: 'Câu hỏi thường gặp' },
    help_faq_hint: { en: 'Click a question to see the answer', vi: 'Nhấn vào câu hỏi để xem câu trả lời' },
    help_contact_title: { en: 'Contact Support', vi: 'Liên hệ hỗ trợ' },
    help_contact_sub: { en: "Can't find an answer? Our team responds within 24 hours.", vi: 'Không tìm được câu trả lời? Đội ngũ hỗ trợ sẽ phản hồi trong vòng 24 giờ.' },
    help_contact_ph: { en: 'Describe your issue...', vi: 'Mô tả vấn đề bạn gặp phải...' },
    help_contact_send: { en: 'Send request', vi: 'Gửi yêu cầu' },
    help_sent: { en: 'Sent! We\'ll reply soon.', vi: 'Đã gửi! Chúng tôi sẽ phản hồi sớm.' },

    // ── Login Page ─────────────────────────────────────────────
    login_title: { en: 'Sign In', vi: 'Đăng nhập' },
    login_signup_title: { en: 'Create Account', vi: 'Tạo tài khoản' },
    login_welcome: { en: 'Welcome back!', vi: 'Chào mừng trở lại!' },
    login_start: { en: 'Start free today', vi: 'Bắt đầu miễn phí ngay hôm nay' },
    login_email: { en: 'Email', vi: 'Email' },
    login_email_ph: { en: 'you@email.com', vi: 'ban@email.com' },
    login_pw: { en: 'Password', vi: 'Mật khẩu' },
    login_pw_ph: { en: '••••••••', vi: '••••••••' },
    login_btn_in: { en: 'Sign In', vi: 'Đăng nhập' },
    login_btn_up: { en: 'Create Account', vi: 'Tạo tài khoản' },
    login_loading: { en: 'Processing...', vi: 'Đang xử lý...' },
    login_no_acct: { en: "Don't have an account? ", vi: 'Chưa có tài khoản? ' },
    login_has_acct: { en: 'Already have an account? ', vi: 'Đã có tài khoản? ' },
    login_go_up: { en: 'Sign up now', vi: 'Đăng ký ngay' },
    login_go_in: { en: 'Sign in', vi: 'Đăng nhập' },
    login_or: { en: 'OR', vi: 'HOẶC' },
    login_check_email: { en: 'Check your inbox!', vi: 'Kiểm tra hộp thư của bạn!' },
    // ── Landing Page ───────────────────────────────────────────
    land_nav_prod: { en: 'Products', vi: 'Sản Phẩm' },
    land_nav_dl: { en: 'Download', vi: 'Tải Xuống' },
    land_nav_about: { en: 'About Us', vi: 'Về Chúng Tôi' },
    land_nav_priv: { en: 'Privacy', vi: 'Bảo Mật' },
    land_nav_in: { en: 'Sign In', vi: 'Đăng Nhập' },
    land_hero_badge: { en: 'NOW IN OPEN BETA', vi: 'ĐANG MỞ BẢN BETA' },
    land_hero_h1_1: { en: 'Manage smarter.', vi: 'Quản lý thông minh hơn.' },
    land_hero_h1_2: { en: 'Grow further.', vi: 'Tiến xa hơn.' },
    land_hero_sub: {
        en: 'Verdant brings AI-powered task management, smart analytics, and seamless collaboration into one elegant dashboard.',
        vi: 'Verdant mang đến công cụ quản lý tác vụ tích hợp AI, phân tích thông minh và cộng tác mượt mà trong một bảng điều khiển.'
    },
    land_hero_cta_1: { en: 'Get Started Free', vi: 'Bắt Đầu Miễn Phí' },
    land_hero_cta_2: { en: 'Download App', vi: 'Tải Ứng Dụng' },
    land_hero_trust: { en: 'TRUSTED BY 2,400+ TEAMS WORLDWIDE', vi: 'TIN DÙNG BỞI HƠN 2.400 ĐỘI NGŨ TOÀN CẦU' },
    land_prod_lbl: { en: 'Our Products', vi: 'Sản Phẩm Của Chúng Tôi' },
    land_prod_h2_1: { en: 'Everything your team needs to ', vi: 'Tất cả những gì đội của bạn cần để ' },
    land_prod_h2_2: { en: 'thrive', vi: 'phát triển' },
    land_prod_1_name: { en: 'Verdant Dashboard', vi: 'Bảng Điểu Khiển Verdant' },
    land_prod_1_desc: { en: 'A unified control center for your projects, tasks, and team — with real-time sync across all devices.', vi: 'Trung tâm kiểm soát thống nhất cho tác vụ và đội nhóm — đồng bộ hóa trực tiếp.' },
    land_prod_1_tag: { en: 'Core', vi: 'Cốt lõi' },
    land_prod_2_name: { en: 'Verdant AI', vi: 'Verdant AI' },
    land_prod_2_desc: { en: 'Let our AI assistant draft reports, answer queries, and surface insights from your data automatically.', vi: 'Để trợ lý AI tạo báo cáo và phân tích thông tin chi tiết.' },
    land_prod_2_tag: { en: 'AI-powered', vi: 'Tích hợp AI' },
    land_prod_3_name: { en: 'Live Sync', vi: 'Đồng bộ trực tiếp' },
    land_prod_3_desc: { en: 'Push updates, deploy changes, and track system health all from within your workspace.', vi: 'Cập nhật, triển khai và theo dõi sức mạnh hệ thống từ không gian làm việc.' },
    land_prod_3_tag: { en: 'Infrastructure', vi: 'Cơ sở hạ tầng' },
    land_prod_4_name: { en: 'Smart Help', vi: 'Hỗ Trợ Thông Minh' },
    land_prod_4_desc: { en: 'Contextual documentation, tutorials, and live support baked right into your workflow.', vi: 'Tài liệu với ngữ cảnh, các chỉ dẫn trực tiếp trong luồng công việc.' },
    land_prod_4_tag: { en: 'Support', vi: 'Hỗ trợ' },
    land_dl_lbl: { en: 'Download', vi: 'Tải xuống' },
    land_dl_h2_1: { en: 'Take Verdant ', vi: 'Mang theo Verdant ' },
    land_dl_h2_2: { en: 'everywhere', vi: 'mọi nơi' },
    land_dl_sub: { en: 'Available on macOS, Windows, Linux, iOS, and Android. Your data stays perfectly in sync across every device.', vi: 'Sẵn sàng trên đa nền tảng. Dễ dàng sử dụng.' },
    land_dl_mac: { en: 'Download for macOS', vi: 'Tải cho macOS' },
    land_dl_win: { en: 'Download for Windows', vi: 'Tải cho Windows' },
    land_dl_ios: { en: 'Download on App Store', vi: 'Tải trên App Store' },
    land_dl_and: { en: 'Get it on Google Play', vi: 'Tải trên Google Play' },
    land_dl_mock_rel: { en: 'v2.4.1 — Latest Release', vi: 'v2.4.1 — Phát hành mới nhất' },
    land_abt_lbl: { en: 'About Us', vi: 'Về chúng tôi' },
    land_abt_h2_1: { en: 'Built by makers, ', vi: 'Xây dựng cho bạn, ' },
    land_abt_h2_2: { en: 'for makers', vi: 'vì bạn' },
    land_abt_p1: {
        en: "We're a small team of engineers and designers who got tired of juggling ten different tools to manage our own work. So we built Verdant — the dashboard we always wished existed.",
        vi: 'Một nhóm kỹ sư mệt mỏi với đống công cụ rời rạc đã tạo ra Verdant - một công cụ thống nhất.'
    },
    land_abt_p2: {
        en: 'Our mission is to reduce digital clutter and give every individual and team a single, beautiful place to see what matters most.',
        vi: 'Tập trung vào những gì quan trọng nhất với không gian duy nhất.'
    },
    land_abt_stat1_lbl: { en: 'Active Teams', vi: 'Đội nhóm hoạt động' },
    land_abt_stat2_lbl: { en: 'Uptime SLA', vi: 'Cam kết Uptime' },
    land_abt_stat3_lbl: { en: 'Avg Latency', vi: 'Độ trễ trung bình' },
    land_abt_stat4_lbl: { en: 'App Rating', vi: 'Đánh giá ứng dụng' },
    land_abt_team_lbl: { en: 'The Team', vi: 'Đội ngũ' },
    land_abt_role1: { en: 'Co-founder & CEO', vi: 'Đồng sáng lập & CEO' },
    land_abt_role2: { en: 'CTO & Lead Eng.', vi: 'CTO & Kỹ Sư Trưởng' },
    land_abt_role3: { en: 'Head of Design', vi: 'Giám đốc thiết kế' },
    land_abt_role4: { en: 'Head of Product', vi: 'Giám đốc sản phẩm' },
    land_priv_lbl: { en: 'Privacy & Terms', vi: 'Quyền Riêng Tư & Điều Khoản' },
    land_priv_h2_1: { en: 'Your data, ', vi: 'Dữ liệu của bạn, ' },
    land_priv_h2_2: { en: 'your control', vi: 'bạn nắm quyền' },
    land_priv_t1: { en: 'Data Collection', vi: 'Thu thập dữ liệu' },
    land_priv_b1: { en: 'We collect only the minimum data needed to operate the service — your email address and usage metadata. We never sell or share your personal information with third parties.', vi: 'Chúng tôi chỉ thu thập dữ liệu tối thiểu. Không bao giờ bán dữ liệu bạn cho một bên thứ ba nào.' },
    land_priv_t2: { en: 'Data Storage', vi: 'Lưu Trữ Dữ Liệu' },
    land_priv_b2: { en: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Servers are hosted in ISO 27001-certified data centers. You can request full data export at any time.', vi: 'Dữ liệu của bạn được mã hóa an toàn ở mức cao nhất.' },
    land_priv_t3: { en: 'Cookies', vi: 'Cookies' },
    land_priv_b3: { en: 'We use strictly necessary session cookies for authentication. No third-party advertising or tracking cookies are used on this platform.', vi: 'Cookies dùng cho xác thực. Chúng tôi không thu thập thông tin cá nhân của bạn để quảng cáo.' },
    land_priv_t4: { en: 'Your Rights', vi: 'Quyền lợi của bạn' },
    land_priv_b4: { en: 'Under GDPR and CCPA, you have the right to access, correct, or delete your data at any time. Contact privacy@verdant.app to exercise your rights.', vi: 'Bạn có đầy đủ quyền lợi với dữ liệu cá nhân của bản thân.' },
    land_priv_t5: { en: 'Terms of Service', vi: 'Điều khoản Dịch Vụ' },
    land_priv_b5: { en: 'By using Verdant you agree to our Terms of Service. We reserve the right to suspend accounts that violate our community standards or are used for unlawful activity.', vi: 'Bằng việc sử dụng Verdant bạn đồng ý với Điều khoản của chúng tôi.' },
    land_priv_rev: { en: 'LAST REVIEWED: JANUARY 2025 · QUESTIONS? CONTACT legal@verdant.app', vi: 'CẬP NHẬT LẦN CUỐI: THÁNG 1/2025 · HỖ TRỢ: legal@verdant.app' },
    land_foot_copy: { en: '© 2025 VERDANT INC. · ALL RIGHTS RESERVED', vi: '© 2025 VERDANT INC. · TẤT CẢ CÁC QUYỀN ĐƯỢC BẢO LƯU' },
}

/**
 * t(key, lang) → returns the translated string
 * @param {string} key  — key from translations above
 * @param {string} lang — 'en' | 'vi'
 */
export function t(key, lang = 'vi') {
    const entry = translations[key]
    if (!entry) { console.warn(`[i18n] Missing key: ${key}`); return key }
    return entry[lang] ?? entry['vi'] ?? key
}
