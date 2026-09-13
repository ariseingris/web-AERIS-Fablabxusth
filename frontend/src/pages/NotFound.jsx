import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home, Leaf, SearchX } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        boxSizing: 'border-box',
        background:
          'radial-gradient(circle at 50% 20%, rgba(16,185,129,0.10), transparent 38%), #07120c',
        color: '#e2f5e8',
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <section
        style={{
          width: 'min(680px, 100%)',
          textAlign: 'center',
          padding: '48px 28px',
          border: '1px solid rgba(74, 222, 128, 0.14)',
          borderRadius: 24,
          background: 'rgba(13, 31, 20, 0.78)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            margin: '0 auto 24px',
            borderRadius: 22,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(16,185,129,0.10)',
            border: '1px solid rgba(16,185,129,0.20)',
          }}
        >
          <SearchX size={36} color="#4ade80" strokeWidth={1.7} />
        </div>

        <div
          style={{
            fontSize: 88,
            lineHeight: 0.95,
            fontWeight: 800,
            letterSpacing: '-0.06em',
            color: '#4ade80',
          }}
        >
          404
        </div>

        <h1
          style={{
            margin: '22px 0 10px',
            fontSize: 'clamp(24px, 5vw, 34px)',
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
          }}
        >
          Không tìm thấy trang
        </h1>

        <p
          style={{
            maxWidth: 500,
            margin: '0 auto',
            color: '#9bb5a2',
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          Đường dẫn bạn đang truy cập không tồn tại hoặc đã được di chuyển.
          Hãy quay lại khu vực bạn cần để tiếp tục sử dụng AERIS.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 12,
            marginTop: 30,
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={buttonStyle('secondary')}
          >
            <ArrowLeft size={17} />
            Quay lại
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={buttonStyle('primary')}
          >
            <Home size={17} />
            Về trang chủ
          </button>
        </div>

        <div
          style={{
            marginTop: 34,
            paddingTop: 20,
            borderTop: '1px solid rgba(148,163,184,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: '#6f8d78',
            fontSize: 12,
          }}
        >
          <Leaf size={14} />
          <span>AERIS · Micro-climate &amp; Emission Monitoring</span>
        </div>
      </section>
    </main>
  )
}

function buttonStyle(variant) {
  const primary = variant === 'primary'

  return {
    border: primary
      ? '1px solid rgba(74,222,128,0.28)'
      : '1px solid rgba(148,163,184,0.16)',
    borderRadius: 10,
    padding: '11px 17px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 650,
    color: primary ? '#052e16' : '#d5e6da',
    background: primary ? '#4ade80' : 'rgba(255,255,255,0.04)',
    transition: 'transform 160ms ease, opacity 160ms ease, background 160ms ease',
  }
}
