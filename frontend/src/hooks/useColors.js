/**
 * useColors.js
 * Returns a full color palette based on the current theme (dark / light).
 * Import and call this in any page component.
 */
import { useTheme } from '../contexts/ThemeContext'

const DARK = {
  // Backgrounds
  pageBg:        'transparent',
  cardBg:        'rgba(255,255,255,0.03)',
  cardBorder:    'rgba(255,255,255,0.08)',
  cardBgHover:   'rgba(255,255,255,0.05)',
  cardBorderHover:'rgba(16,185,129,0.3)',
  inputBg:       'rgba(255,255,255,0.05)',
  inputBorder:   'rgba(255,255,255,0.1)',
  inputColor:    '#f0fdf4',

  // Text
  heading:       '#f0fdf4',
  subheading:    '#6ee7b7',
  body:          '#d1fae5',
  muted:         '#86efac',
  faint:         '#4ade80',
  veryFaint:     '#166534',

  // Accents
  accent:        '#34d399',
  accentSub:     '#10b981',
  accentBg:      'rgba(52,211,153,0.08)',
  accentBorder:  'rgba(52,211,153,0.15)',
  accentBgStrong:'rgba(6,95,70,0.25)',
  accentBorderStrong:'rgba(16,185,129,0.2)',

  // Divider
  divider:       'rgba(255,255,255,0.05)',

  // Tag colors
  tagUp:         '#34d399',
  tagUpBg:       'rgba(52,211,153,0.1)',
  tagUpBorder:   'rgba(52,211,153,0.2)',
  tagDown:       '#f87171',
  tagDownBg:     'rgba(248,113,113,0.1)',
  tagDownBorder: 'rgba(248,113,113,0.2)',
}

const LIGHT = {
  // Backgrounds
  pageBg:        'transparent',
  cardBg:        '#ffffff',
  cardBorder:    '#e2e8f0',
  cardBgHover:   '#f8fafc',
  cardBorderHover:'#10b981',
  inputBg:       '#f8fafc',
  inputBorder:   '#cbd5e1',
  inputColor:    '#0f172a',

  // Text
  heading:       '#0f172a',
  subheading:    '#065f46',
  body:          '#1e293b',
  muted:         '#334155',
  faint:         '#475569',
  veryFaint:     '#64748b',

  // Accents
  accent:        '#059669',
  accentSub:     '#047857',
  accentBg:      'rgba(5,150,105,0.08)',
  accentBorder:  'rgba(5,150,105,0.25)',
  accentBgStrong:'rgba(5,150,105,0.12)',
  accentBorderStrong:'rgba(5,150,105,0.3)',

  // Divider
  divider:       '#e2e8f0',

  // Tag colors
  tagUp:         '#065f46',
  tagUpBg:       'rgba(5,150,105,0.1)',
  tagUpBorder:   'rgba(5,150,105,0.25)',
  tagDown:       '#b91c1c',
  tagDownBg:     'rgba(185,28,28,0.08)',
  tagDownBorder: 'rgba(185,28,28,0.2)',
}

export function useColors() {
  const { theme } = useTheme()
  const effective =
    theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
  return effective === 'light' ? LIGHT : DARK
}