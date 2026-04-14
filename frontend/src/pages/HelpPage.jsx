import { useState } from 'react'
import { useLang } from '../contexts/LangContext'
import { t } from '../i18n'
import { useColors } from '../hooks/useColors'

const FAQS = [
    {
        q: 'Làm thế nào để đặt lại mật khẩu?',
        a: 'Vào Cài đặt → Bảo mật → nhấn "Gửi email đặt lại mật khẩu". Kiểm tra hộp thư (kể cả Spam) và nhấn vào liên kết trong vòng 60 phút.',
    },
    {
        q: 'Khu vực AI hoạt động như thế nào?',
        a: 'Trợ lý AI sử dụng mô hình ngôn ngữ lớn để phân tích dữ liệu, tạo báo cáo và trả lời câu hỏi. Mọi cuộc trò chuyện đều được mã hoá và không được dùng để huấn luyện mô hình.',
    },
    {
        q: 'Làm thế nào để hủy đăng ký?',
        a: 'Vào Cài đặt → Hồ sơ → cuộn xuống cuối trang → nhấn "Xóa tài khoản". Tất cả dữ liệu sẽ bị xóa vĩnh viễn sau 30 ngày.',
    },
    {
        q: 'Dữ liệu của tôi có được bảo mật không?',
        a: 'Có. Mọi dữ liệu được mã hoá AES-256 khi lưu trữ và TLS 1.3 khi truyền tải. Chúng tôi không bán hoặc chia sẻ dữ liệu cá nhân với bên thứ ba.',
    },
    {
        q: 'Tôi có thể xuất dữ liệu của mình không?',
        a: 'Có, bạn có thể yêu cầu xuất toàn bộ dữ liệu tài khoản bất cứ lúc nào qua trang Cài đặt hoặc bằng cách liên hệ bộ phận hỗ trợ.',
    },
    {
        q: 'Hỗ trợ những phương thức đăng nhập nào?',
        a: 'Hiện tại chúng tôi hỗ trợ: Email/Mật khẩu, Google OAuth, và X (Twitter) OAuth. Chúng tôi đang phát triển thêm GitHub và Discord.',
    },
]

const DOCS = [
    { icon: '🚀', title: 'Bắt đầu nhanh', desc: 'Hướng dẫn thiết lập tài khoản và sử dụng các tính năng cơ bản trong 5 phút.' },
    { icon: '🤖', title: 'Hướng dẫn AI', desc: 'Cách viết câu hỏi hiệu quả và tận dụng tối đa trợ lý AI.' },
    { icon: '📊', title: 'Báo cáo & Phân tích', desc: 'Tạo, xuất và chia sẻ báo cáo tùy chỉnh từ dữ liệu của bạn.' },
    { icon: '🔐', title: 'Bảo mật & Quyền riêng tư', desc: 'Chính sách bảo mật, cách bảo vệ tài khoản và quyền GDPR của bạn.' },
]

function FaqItem({ q, a, c }) {
    const [open, setOpen] = useState(false)
    return (
        <div style={{
            borderBottom: `1px solid ${c.divider}`,
            overflow: 'hidden',
        }}>
            <button onClick={() => setOpen(o => !o)} style={{
                width: '100%', textAlign: 'left', padding: '16px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                fontFamily: 'inherit',
            }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: c.body }}>{q}</span>
                <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: open ? c.accentBgStrong : c.inputBg,
                    border: `1px solid ${open ? c.cardBorderHover : c.inputBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: c.accent, transition: 'all 0.2s',
                    transform: open ? 'rotate(45deg)' : 'none',
                }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </div>
            </button>
            <div style={{
                maxHeight: open ? 200 : 0, overflow: 'hidden',
                transition: 'max-height 0.3s ease',
            }}>
                <p style={{ fontSize: 14, color: c.muted, lineHeight: 1.7, margin: '0 0 16px', paddingRight: 36 }}>{a}</p>
            </div>
        </div>
    )
}

export default function HelpPage() {
    const { lang } = useLang()
    const c = useColors()
    const [contactMsg, setContactMsg] = useState('')
    const [sent, setSent] = useState(false)

    const handleSend = () => {
        if (!contactMsg.trim()) return
        setSent(true)
        setContactMsg('')
        setTimeout(() => setSent(false), 3000)
    }

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: c.body, maxWidth: 720 }}>
            <style>{`*{box-sizing:border-box}textarea:focus{border-color:${c.accentBorder}!important;outline:none;box-shadow:0 0 0 3px ${c.accentBg}}`}</style>

            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: c.heading, margin: 0 }}>{t('help_title', lang)}</h1>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: c.subheading }}>{t('help_subtitle', lang)}</p>
            </div>

            {/* Docs grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
                {DOCS.map(({ icon, title, desc }) => (
                    <div key={title} style={{
                        padding: '18px 16px', borderRadius: 12,
                        background: c.cardBg, border: `1px solid ${c.cardBorder}`,
                        cursor: 'pointer', transition: 'all 0.2s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = c.cardBorderHover; e.currentTarget.style.background = c.cardBgHover }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = c.cardBorder; e.currentTarget.style.background = c.cardBg }}
                    >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: c.body, marginBottom: 6 }}>{title}</div>
                        <div style={{ fontSize: 12, color: c.faint, lineHeight: 1.5 }}>{desc}</div>
                    </div>
                ))}
            </div>

            {/* FAQ */}
            <div style={{
                background: c.cardBg, border: `1px solid ${c.cardBorder}`,
                borderRadius: 14, padding: '24px', marginBottom: 24,
            }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: c.heading, margin: '0 0 4px' }}>{t('help_faq_title', lang)}</h2>
                <p style={{ fontSize: 13, color: c.faint, margin: '0 0 20px' }}>{t('help_faq_hint', lang)}</p>
                {FAQS.map(faq => <FaqItem key={faq.q} {...faq} c={c} />)}
            </div>

            {/* Contact */}
            <div style={{
                background: c.cardBg, border: `1px solid ${c.cardBorder}`,
                borderRadius: 14, padding: '24px',
            }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: c.heading, margin: '0 0 4px' }}>{t('help_contact_title', lang)}</h2>
                <p style={{ fontSize: 13, color: c.faint, margin: '0 0 16px' }}>{t('help_contact_sub', lang)}</p>
                <textarea
                    value={contactMsg}
                    onChange={e => setContactMsg(e.target.value)}
                    placeholder={t('help_contact_ph', lang)}
                    rows={4}
                    style={{
                        width: '100%', padding: '12px 14px', borderRadius: 8,
                        background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                        color: c.inputColor, fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
                        marginBottom: 12, transition: 'all 0.2s',
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                    {sent && (
                        <span style={{ fontSize: 14, color: c.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            {t('help_sent', lang)}
                        </span>
                    )}
                    <button onClick={handleSend} disabled={!contactMsg.trim()} style={{
                        padding: '10px 24px', borderRadius: 8, border: 'none',
                        background: contactMsg.trim() ? `linear-gradient(135deg,${c.accentSub},${c.accent})` : c.inputBg,
                        color: contactMsg.trim() ? 'white' : c.faint,
                        cursor: contactMsg.trim() ? 'pointer' : 'default',
                        fontFamily: 'inherit', fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
                    }}>{t('help_contact_send', lang)}</button>
                </div>
            </div>
        </div>
    )
}
