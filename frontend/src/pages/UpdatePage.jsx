import { useLang } from '../contexts/LangContext'
import { useColors } from '../hooks/useColors'
import { t } from '../i18n'

const CHANGELOG = [
  {
    version: 'v2.4.1', date: '2026-03-01', type: 'patch',
    changes: [
      { type: 'fix', text: 'Sửa lỗi sidebar không thu gọn đúng trên màn hình nhỏ' },
      { type: 'fix', text: 'Khắc phục vấn đề timeout khi đăng nhập bằng Google OAuth' },
      { type: 'fix', text: 'Cải thiện hiệu suất tải trang Dashboard (~30% nhanh hơn)' },
    ],
  },
  {
    version: 'v2.4.0', date: '2026-02-15', type: 'minor',
    changes: [
      { type: 'new', text: 'Ra mắt Khu vực AI với giao diện chat thông minh' },
      { type: 'new', text: 'Thêm biểu đồ sparkline trực quan trên trang Tổng quan' },
      { type: 'improve', text: 'Cải thiện giao diện Cài đặt với tabs rõ ràng hơn' },
      { type: 'improve', text: 'Thêm dark mode tự động theo hệ thống' },
      { type: 'fix', text: 'Sửa lỗi mất phiên đăng nhập sau 24 giờ' },
    ],
  },
  {
    version: 'v2.3.0', date: '2026-01-20', type: 'minor',
    changes: [
      { type: 'new', text: 'Tích hợp đăng nhập bằng X (Twitter)' },
      { type: 'new', text: 'Thêm trang Trợ giúp với FAQ tương tác' },
      { type: 'improve', text: 'Tối ưu hóa truy vấn database — giảm 40% thời gian phản hồi' },
      { type: 'fix', text: 'Sửa lỗi hiển thị avatar khi tên người dùng có ký tự đặc biệt' },
    ],
  },
  {
    version: 'v2.2.0', date: '2025-12-10', type: 'minor',
    changes: [
      { type: 'new', text: 'Thêm thống kê doanh thu và người dùng theo thời gian thực' },
      { type: 'new', text: 'Ra mắt tính năng xuất báo cáo PDF' },
      { type: 'improve', text: 'Sidebar hiện hỗ trợ collapse/expand mượt mà hơn' },
    ],
  },
]

export default function UpdatePage() {
  const { lang } = useLang()
  const C = useColors()

  const typeStyle = {
    new:     { bg: C.accentBg,      border: C.accentBorder,      color: C.accent,    label: t('upd_new', lang) },
    fix:     { bg: C.tagDownBg,     border: C.tagDownBorder,     color: C.tagDown,   label: t('upd_fix', lang) },
    improve: { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)', color: '#3b82f6', label: t('upd_improve', lang) },
  }

  const versionBadge = {
    patch: { color: C.subheading,  bg: C.accentBgStrong, border: C.accentBorderStrong },
    minor: { color: C.accent,      bg: C.accentBg,       border: C.accentBorder },
    major: { color: '#8b5cf6',     bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: C.body, maxWidth: 720 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}`}</style>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.heading, margin: 0 }}>{t('upd_title', lang)}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.subheading }}>{t('upd_subtitle', lang)}</p>
      </div>

      {/* Latest badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        background: C.accentBg, border: `1px solid ${C.accentBorder}`,
        borderRadius: 12, marginBottom: 28,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, boxShadow: `0 0 8px ${C.accent}` }} />
        <span style={{ fontSize: 13, color: C.accent, fontWeight: 500 }}>{t('upd_current', lang)} </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: C.subheading }}>v2.4.1</span>
        <span style={{ fontSize: 13, color: C.faint, marginLeft: 'auto' }}>{t('upd_released', lang)} 01-03-2026</span>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 18, top: 8, bottom: 0, width: 2,
          background: `linear-gradient(to bottom, ${C.accentBorder}, transparent)`,
        }} />

        {CHANGELOG.map((release, ri) => {
          const badge = versionBadge[release.type]
          return (
            <div key={release.version} style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
              {/* Dot */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: ri === 0 ? 'linear-gradient(135deg,#065f46,#10b981)' : C.cardBg,
                  border: `2px solid ${ri === 0 ? '#10b981' : C.cardBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: ri === 0 ? 'white' : C.faint,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {ri === 0
                      ? <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>
                      : <><circle cx="12" cy="12" r="10" /><polyline points="12 8 12 12 14 14" /></>}
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500, color: C.heading }}>{release.version}</span>
                  <span style={{
                    fontSize: 11, fontFamily: "'DM Mono', monospace", padding: '3px 8px', borderRadius: 100,
                    background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color,
                  }}>{release.type.toUpperCase()}</span>
                  {ri === 0 && (
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 100,
                      background: C.accentBg, border: `1px solid ${C.accentBorder}`, color: C.accent,
                      fontFamily: "'DM Mono', monospace",
                    }}>LATEST</span>
                  )}
                  <span style={{ fontSize: 12, color: C.faint, marginLeft: 'auto', fontFamily: "'DM Mono', monospace" }}>
                    {new Date(release.date).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                  {release.changes.map((c, ci) => {
                    const ts = typeStyle[c.type]
                    return (
                      <div key={ci} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderBottom: ci < release.changes.length - 1 ? `1px solid ${C.divider}` : 'none',
                      }}>
                        <span style={{
                          fontSize: 10, fontFamily: "'DM Mono', monospace", flexShrink: 0,
                          padding: '2px 7px', borderRadius: 100,
                          background: ts.bg, border: `1px solid ${ts.border}`, color: ts.color,
                          width: 62, textAlign: 'center',
                        }}>{ts.label}</span>
                        <span style={{ fontSize: 14, color: C.body, lineHeight: 1.5 }}>{c.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}