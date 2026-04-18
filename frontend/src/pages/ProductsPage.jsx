import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useLang } from '../contexts/LangContext'
import { useTheme } from '../contexts/ThemeContext'
import ReactMarkdown from 'react-markdown'

const DARK = {
  pageBg: 'transparent',
  titleColor: '#f1f5f9',
  cardBg: '#1e293b',
  cardBorder: 'rgba(100,116,139,0.3)',
  nameColor: '#f1f5f9',
  descColor: '#94a3b8',
  emptyColor: '#64748b',
}

const LIGHT = {
  pageBg: 'transparent',
  titleColor: '#0f172a',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  nameColor: '#0f172a',
  descColor: '#64748b',
  emptyColor: '#94a3b8',
}

function ProductCard({ product, C, lang }) {
  const [expanded, setExpanded] = useState(false)

  const getName = (p) => (lang === 'vi' && p.name_vi) ? p.name_vi : p.name
  const getDesc = (p) => (lang === 'vi' && p.description_vi) ? p.description_vi : p.description

  const displayDescription = getDesc(product)
  const plainText = displayDescription ? displayDescription.replace(/[#*_`>\-]/g, '').trim() : ''
  const isLong = plainText.length > 120
  const preview = isLong && !expanded ? plainText.slice(0, 120) + '...' : null

  return (
    <div
      style={{
        background: C.cardBg,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: C.cardBg === '#1e293b'
          ? '0 4px 16px rgba(0,0,0,0.4)'
          : '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ position: 'relative', paddingTop: '60%', overflow: 'hidden' }}>
        <img
          src={product.image_url || 'https://placehold.co/400x200?text=No+Image'}
          alt={getName(product)}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x200?text=No+Image' }}
        />
      </div>
      <div style={{ padding: '16px 18px 20px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.nameColor, marginBottom: 8 }}>
          {getName(product)}
        </div>
        {displayDescription && (
          <>
            <div className="product-desc" style={{ fontSize: 13, color: C.descColor, lineHeight: 1.6 }}>
              {preview ? (
                <p style={{ margin: 0 }}>{preview}</p>
              ) : (
                <ReactMarkdown>{displayDescription}</ReactMarkdown>
              )}
            </div>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#10b981', fontSize: 12, padding: '4px 0', fontWeight: 600,
                }}
              >
                {expanded ? '▲ Thu gọn' : '▼ Xem thêm'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const { lang } = useLang()
  const { theme } = useTheme()
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  )
  useEffect(() => {
    if (theme !== 'system') return
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const effectiveTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  const C = effectiveTheme === 'light' ? LIGHT : DARK

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, image_url, description, created_at, name_vi, description_vi')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setProducts(data || [])
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid rgba(16,185,129,0.2)',
        borderTopColor: '#10b981',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ padding: 32, color: '#f87171', fontSize: 14 }}>
      Error: {error}
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        .product-desc p { margin: 4px 0; }
        .product-desc strong { color: inherit; font-weight: 600; }
        .product-desc ul { padding-left: 16px; margin: 4px 0; }
        .product-desc li { margin: 2px 0; }
      `}</style>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.titleColor, marginBottom: 28, marginTop: 0 }}>
        Products
      </h1>

      {products.length === 0 ? (
        <p style={{ color: C.emptyColor, fontSize: 14 }}>No products yet.</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 320px))',
          gap: '24px',
          justifyContent: 'start',
        }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} C={C} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}
