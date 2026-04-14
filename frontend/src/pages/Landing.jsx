// Landing page intentionally uses fixed dark theme — does not use useColors()
/**
 * Landing.jsx
 * ─────────────────────────────────────────────────────────────
 * Full landing page matching the App.jsx emerald theme.
 * Sections: Navbar, Hero, Products, Download, About Us, Privacy, Footer
 *
 * TODO: Replace all placeholder text, images, and links with real content.
 * TODO: Update the route in App.jsx: <Route path="/" element={<Landing />} />
 *       and import Landing from './pages/Landing'
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../contexts/LangContext'
import { t } from '../i18n'

// ── Scroll-reveal hook ─────────────────────────────────────────
function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// ── Reveal wrapper ─────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export default function Landing() {
  const { lang } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", background: '#0a1a12', color: '#e8f5e9', minHeight: '100vh' }}>

      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: #065f46; color: #fff; }

        .nav-link {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a7d3b5;
          text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
        }
        .nav-link:hover { color: #6ee7b7; }

        .btn-primary {
          display: inline-block;
          background: #065f46;
          color: #d1fae5;
          padding: 14px 36px;
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          border: 1px solid #059669;
          transition: background 0.2s, color 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }
        .btn-primary:hover {
          background: #047857;
          color: #fff;
          box-shadow: 0 0 24px rgba(16,185,129,0.25);
        }

        .btn-outline {
          display: inline-block;
          background: transparent;
          color: #6ee7b7;
          padding: 13px 35px;
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          border: 1px solid #065f46;
          transition: background 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }
        .btn-outline:hover {
          background: rgba(6,95,70,0.2);
          box-shadow: 0 0 16px rgba(16,185,129,0.15);
        }

        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          padding: 40px 32px;
          transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
        }
        .card:hover {
          border-color: rgba(16,185,129,0.3);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }

        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #10b981;
          margin-bottom: 16px;
        }

        .divider {
          width: 48px;
          height: 2px;
          background: #065f46;
          margin: 24px 0;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.5; }
          100% { transform: scale(1.6);  opacity: 0; }
        }
        .float-1 { animation: float 8s ease-in-out infinite; }
        .float-2 { animation: float 11s ease-in-out infinite reverse; }
        .float-3 { animation: float 7s  ease-in-out infinite 2s; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════════ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 48px',
        height: '72px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,26,18,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/Aeris.svg" alt="Aeris" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500, color: '#d1fae5', letterSpacing: '0.05em' }}>
            Aeris
          </span>
        </div>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          {[
            { label: t('land_nav_prod', lang), id: 'products' },
            { label: t('land_nav_dl', lang), id: 'download' },
            { label: t('land_nav_about', lang), id: 'about' },
            { label: t('land_nav_priv', lang), id: 'privacy' },
          ].map(({ label, id }) => (
            <button key={id} className="nav-link" onClick={() => scrollTo(id)}>{label}</button>
          ))}
          <Link to="/login" className="btn-primary" style={{ padding: '10px 24px' }}>
            {t('land_nav_in', lang)}
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#6ee7b7' }}
          id="hamburger"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen
              ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
            }
          </svg>
        </button>
      </header>

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '120px 48px 80px',
      }}>
        {/* Ambient background blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div className="float-1" style={{
            position: 'absolute', top: '10%', right: '8%',
            width: 420, height: 420, borderRadius: '60% 40% 50% 70% / 50% 60% 40% 60%',
            background: 'radial-gradient(circle, rgba(6,95,70,0.35) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          <div className="float-2" style={{
            position: 'absolute', bottom: '15%', left: '5%',
            width: 300, height: 300, borderRadius: '40% 60% 70% 30% / 60% 40% 60% 40%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }} />
          <div className="float-3" style={{
            position: 'absolute', top: '40%', left: '35%',
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(5,150,105,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />
          {/* Grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div style={{ maxWidth: 820, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(6,95,70,0.25)', border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 100, padding: '6px 18px', marginBottom: 40,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -4, borderRadius: '50%', border: '1px solid #10b981',
                animation: 'pulse-ring 2s ease-out infinite',
              }} />
            </div>
            {/* TODO: Replace badge text with your tagline or status */}
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', color: '#6ee7b7' }}>
              {t('land_hero_badge', lang)}
            </span>
          </div>

          {/* Headline */}
          {/* TODO: Replace with your real headline */}
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 96px)',
            fontWeight: 300,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#f0fdf4',
            marginBottom: 28,
          }}>
            {t('land_hero_h1_1', lang)}<br />
            <em style={{ color: '#34d399', fontStyle: 'italic', fontWeight: 300 }}>{t('land_hero_h1_2', lang)}</em>
          </h1>

          {/* Sub */}
          {/* TODO: Replace with your real value proposition */}
          <p style={{
            fontSize: 20, fontWeight: 300, color: '#86efac',
            lineHeight: 1.7, maxWidth: 560, margin: '0 auto 48px',
          }}>
            {t('land_hero_sub', lang)}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn-primary">{t('land_hero_cta_1', lang)}</Link>
            <button className="btn-outline" onClick={() => scrollTo('download')}>
              {t('land_hero_cta_2', lang)}
            </button>
          </div>

          {/* Social proof */}
          {/* TODO: Replace with real user count or testimonial */}
          <p style={{ marginTop: 48, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#4ade80', letterSpacing: '0.1em' }}>
            {t('land_hero_trust', lang)}
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PRODUCTS  (#products)
      ══════════════════════════════════════════════════════════ */}
      <section id="products" style={{ padding: '120px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <p className="section-label">{t('land_prod_lbl', lang)}</p>
          {/* TODO: Replace section title */}
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 300, lineHeight: 1.15, color: '#f0fdf4', maxWidth: 560 }}>
            {t('land_prod_h2_1', lang)}
            <em style={{ color: '#34d399', fontStyle: 'italic' }}>{t('land_prod_h2_2', lang)}</em>
          </h2>
          <div className="divider" />
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 48 }}>
          {[
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              ),
              // TODO: Replace product name, description
              name: t('land_prod_1_name', lang),
              desc: t('land_prod_1_desc', lang),
              tag: t('land_prod_1_tag', lang),
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" /><path d="M12 7v4" />
                </svg>
              ),
              // TODO: Replace product name, description
              name: t('land_prod_2_name', lang),
              desc: t('land_prod_2_desc', lang),
              tag: t('land_prod_2_tag', lang),
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5">
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              ),
              // TODO: Replace product name, description
              name: t('land_prod_3_name', lang),
              desc: t('land_prod_3_desc', lang),
              tag: t('land_prod_3_tag', lang),
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ),
              // TODO: Replace product name, description
              name: t('land_prod_4_name', lang),
              desc: t('land_prod_4_desc', lang),
              tag: t('land_prod_4_tag', lang),
            },
          ].map(({ icon, name, desc, tag }, i) => (
            <Reveal key={name} delay={i * 80}>
              <div className="card">
                <div style={{
                  width: 52, height: 52, borderRadius: 12,
                  background: 'rgba(6,95,70,0.3)', border: '1px solid rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  {icon}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.15em', color: '#10b981', marginBottom: 8 }}>
                  {tag}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 400, color: '#f0fdf4', marginBottom: 12 }}>{name}</h3>
                <p style={{ fontSize: 16, fontWeight: 300, color: '#86efac', lineHeight: 1.65 }}>{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          DOWNLOAD  (#download)
      ══════════════════════════════════════════════════════════ */}
      <section id="download" style={{
        padding: '120px 48px',
        background: 'rgba(6,95,70,0.08)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <Reveal>
              <p className="section-label">{t('land_dl_lbl', lang)}</p>
              {/* TODO: Replace with your app download headline */}
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 300, lineHeight: 1.15, color: '#f0fdf4', marginBottom: 20 }}>
                {t('land_dl_h2_1', lang)}<br />
                <em style={{ color: '#34d399', fontStyle: 'italic' }}>{t('land_dl_h2_2', lang)}</em>
              </h2>
              <div className="divider" />
              {/* TODO: Replace with real description */}
              <p style={{ fontSize: 17, fontWeight: 300, color: '#86efac', lineHeight: 1.7, marginBottom: 40 }}>
                {t('land_dl_sub', lang)}
              </p>

              {/* Download buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  {
                    label: t('land_dl_mac', lang),
                    // TODO: Replace href with real macOS download link
                    href: '#',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                    ),
                  },
                  {
                    label: t('land_dl_win', lang),
                    // TODO: Replace href with real Windows download link
                    href: '#',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 12V6.75l6-1.32v6.57H3zm17 0V3.5L11 2v10h9zM3 13.25L9 14v-1.5H3v.75zm17 0v6.25l-9-1.25V13.25h9z" />
                      </svg>
                    ),
                  },
                  {
                    label: t('land_dl_ios', lang),
                    // TODO: Replace href with real App Store link
                    href: '#',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                    ),
                  },
                  {
                    label: t('land_dl_and', lang),
                    // TODO: Replace href with real Play Store link
                    href: '#',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 20.5v-17c0-.83 1-.83 1.5-.5L20 12 4.5 21c-.5.33-1.5.33-1.5-.5z" />
                      </svg>
                    ),
                  },
                ].map(({ label, href, icon }) => (
                  <a key={label} href={href} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: '#d1fae5', textDecoration: 'none',
                    fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: '0.06em',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.background = 'rgba(6,95,70,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  >
                    <span style={{ color: '#34d399' }}>{icon}</span>
                    {label}
                  </a>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Visual mockup */}
          <Reveal delay={150}>
            <div style={{
              position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}>
              {/* TODO: Replace this mockup with a real screenshot or app preview */}
              <div style={{
                width: '100%', maxWidth: 380, aspectRatio: '9/16',
                borderRadius: 32, border: '2px solid rgba(16,185,129,0.2)',
                background: 'linear-gradient(160deg, #0d2416 0%, #0a1a12 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative',
                boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
              }}>
                <div style={{
                  position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
                  width: 80, height: 80, borderRadius: 20,
                  background: 'linear-gradient(135deg, #065f46, #10b981)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                {/* TODO: App name in mockup */}
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: '#d1fae5', marginTop: 120, letterSpacing: '0.1em' }}>VERDANT</p>
                <p style={{ fontSize: 13, color: '#4ade80', marginTop: 8 }}>v2.4.1 — Latest Release</p>

                {/* Fake UI bars */}
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    width: '75%', height: 10, borderRadius: 5, marginTop: 20,
                    background: `rgba(16,185,129,${0.08 + i * 0.04})`,
                  }} />
                ))}
              </div>
              {/* Glow behind phone */}
              <div style={{
                position: 'absolute', width: 300, height: 300,
                background: 'radial-gradient(circle, rgba(6,95,70,0.4) 0%, transparent 70%)',
                filter: 'blur(60px)', zIndex: -1,
              }} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ABOUT US  (#about)
      ══════════════════════════════════════════════════════════ */}
      <section id="about" style={{ padding: '120px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
          <div>
            <Reveal>
              <p className="section-label">{t('land_abt_lbl', lang)}</p>
              {/* TODO: Replace with your real company story headline */}
              <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 300, lineHeight: 1.15, color: '#f0fdf4', marginBottom: 20 }}>
                {t('land_abt_h2_1', lang)}<br />
                <em style={{ color: '#34d399', fontStyle: 'italic' }}>{t('land_abt_h2_2', lang)}</em>
              </h2>
              <div className="divider" />
              {/* TODO: Replace with your real company description */}
              <p style={{ fontSize: 17, fontWeight: 300, color: '#86efac', lineHeight: 1.8, marginBottom: 24 }}>
                {t('land_abt_p1', lang)}
              </p>
              <p style={{ fontSize: 17, fontWeight: 300, color: '#86efac', lineHeight: 1.8 }}>
                {t('land_abt_p2', lang)}
              </p>
            </Reveal>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingTop: 8 }}>
            {[
              // TODO: Replace with real stats
              { value: '2,400+', label: t('land_abt_stat1_lbl', lang) },
              { value: '98%', label: t('land_abt_stat2_lbl', lang) },
              { value: '12ms', label: t('land_abt_stat3_lbl', lang) },
              { value: '4.9★', label: t('land_abt_stat4_lbl', lang) },
            ].map(({ value, label }, i) => (
              <Reveal key={label} delay={i * 60}>
                <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                  <div style={{ fontSize: 40, fontWeight: 300, color: '#34d399', lineHeight: 1, marginBottom: 8 }}>
                    {value}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.12em', color: '#4ade80', textTransform: 'uppercase' }}>
                    {label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Team */}
        <div style={{ marginTop: 80 }}>
          <Reveal>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.15em', color: '#10b981', textTransform: 'uppercase', marginBottom: 32 }}>
              The Team
            </p>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {[
              // TODO: Replace with real team members
              { name: 'Linh Nguyen', role: t('land_abt_role1', lang), initials: 'LN' },
              { name: 'Minh Tran', role: t('land_abt_role2', lang), initials: 'MT' },
              { name: 'An Pham', role: t('land_abt_role3', lang), initials: 'AP' },
              { name: 'Hoa Le', role: t('land_abt_role4', lang), initials: 'HL' },
            ].map(({ name, role, initials }, i) => (
              <Reveal key={name} delay={i * 60}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: `hsl(${150 + i * 20}, 50%, 25%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#6ee7b7', fontWeight: 500,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <p style={{ fontSize: 16, color: '#f0fdf4', fontWeight: 400 }}>{name}</p>
                    <p style={{ fontSize: 13, color: '#4ade80', fontWeight: 300 }}>{role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PRIVACY  (#privacy)
      ══════════════════════════════════════════════════════════ */}
      <section id="privacy" style={{
        padding: '120px 48px',
        background: 'rgba(6,95,70,0.06)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Reveal>
            <p className="section-label">{t('land_priv_lbl', lang)}</p>
            {/* TODO: Replace with your real privacy policy title */}
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 300, lineHeight: 1.15, color: '#f0fdf4', marginBottom: 20 }}>
              {t('land_priv_h2_1', lang)}<br />
              <em style={{ color: '#34d399', fontStyle: 'italic' }}>{t('land_priv_h2_2', lang)}</em>
            </h2>
            <div className="divider" />
          </Reveal>

          {[
            {
              title: t('land_priv_t1', lang),
              // TODO: Replace with real policy content
              body: t('land_priv_b1', lang),
            },
            {
              title: t('land_priv_t2', lang),
              // TODO: Replace with real policy content
              body: t('land_priv_b2', lang),
            },
            {
              title: t('land_priv_t3', lang),
              // TODO: Replace with real policy content
              body: t('land_priv_b3', lang),
            },
            {
              title: t('land_priv_t4', lang),
              // TODO: Replace with real policy content
              body: t('land_priv_b4', lang),
            },
            {
              title: t('land_priv_t5', lang),
              // TODO: Replace with real policy content
              body: t('land_priv_b5', lang),
            },
          ].map(({ title, body }, i) => (
            <Reveal key={title} delay={i * 60}>
              <div style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '32px 0',
              }}>
                <h3 style={{ fontSize: 20, fontWeight: 400, color: '#d1fae5', marginBottom: 12 }}>{title}</h3>
                <p style={{ fontSize: 16, fontWeight: 300, color: '#86efac', lineHeight: 1.75 }}>{body}</p>
              </div>
            </Reveal>
          ))}

          <Reveal delay={300}>
            <p style={{ marginTop: 40, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#4ade80', letterSpacing: '0.1em' }}>
              {/* TODO: Update last-reviewed date */}
              LAST REVIEWED: JANUARY 2025 · QUESTIONS? CONTACT legal@verdant.app
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{
        padding: '60px 48px 40px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/Aeris.svg" alt="Aeris" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#d1fae5', letterSpacing: '0.06em' }}>Aeris</span>
        </div>

        {/* Footer nav */}
        <nav style={{ display: 'flex', gap: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'Products', id: 'products' },
            { label: 'Download', id: 'download' },
            { label: 'About Us', id: 'about' },
            { label: 'Privacy', id: 'privacy' },
          ].map(({ label, id }) => (
            <button key={id} className="nav-link" onClick={() => scrollTo(id)}>{label}</button>
          ))}
          <Link to="/login" className="nav-link">Sign In →</Link>
        </nav>

        {/* Copyright */}
        {/* TODO: Replace with your company name and year */}
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#166534', letterSpacing: '0.1em', textAlign: 'center' }}>
          © 2025 VERDANT INC. · ALL RIGHTS RESERVED
        </p>
      </footer>

    </div>
  )
}