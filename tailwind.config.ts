import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: { '2xl': '1200px' },
    },
    extend: {
      // Paleta de marca: lila del logo. `violet` no es una estimación — es el
      // color medido píxel a píxel del trazo en `public/logo-previar.png`
      // (8.2:1 sobre #0A0A0A), y lleva el peso de texto e iconos. `lilac` y
      // `deep` son un tinte y una sombra del mismo tono (H 257°), no colores
      // sueltos: 12.7:1 y 4.9:1, así que los tres pasan AA para texto.
      colors: {
        border: 'rgba(255,255,255,0.08)',
        input: 'rgba(255,255,255,0.08)',
        ring: '#B299F1',
        background: '#0A0A0A',
        foreground: '#F5F5F7',
        primary: { DEFAULT: '#B299F1', foreground: '#0A0A0A' },
        secondary: { DEFAULT: 'rgba(255,255,255,0.06)', foreground: '#F5F5F7' },
        destructive: { DEFAULT: '#FF3B5C', foreground: '#FFFFFF' },
        muted: { DEFAULT: '#151518', foreground: '#9B9BA3' },
        accent: { DEFAULT: '#D6C8F9', foreground: '#0A0A0A' },
        popover: { DEFAULT: '#131316', foreground: '#F5F5F7' },
        card: { DEFAULT: '#111114', foreground: '#F5F5F7' },
        neon: { violet: '#B299F1', lilac: '#D6C8F9', deep: '#8C66EA' },
        zone: { green: '#2BFF88', yellow: '#FFD60A', red: '#FF4D6D' },
      },
      // 13 no existe en la escala por defecto: `h-13` se usaba en el botón
      // grande y en "Entrar con Google", y sin esto quedaban de 20px de alto.
      spacing: {
        13: '3.25rem',
      },
      borderRadius: {
        lg: '18px',
        md: '12px',
        sm: '8px',
        xl: '24px',
      },
      fontFamily: {
        sans: ['var(--font-sora)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-unbounded)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-violet': '0 0 28px rgba(178,153,241,0.5), 0 0 80px rgba(178,153,241,0.2)',
        'neon-lilac': '0 0 28px rgba(214,200,249,0.4), 0 0 80px rgba(214,200,249,0.14)',
        sheet: '0 -16px 60px rgba(0,0,0,0.75)',
        card: '0 8px 32px rgba(0,0,0,0.45)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(178,153,241,0.75))' },
          '50%': { filter: 'drop-shadow(0 0 22px rgba(214,200,249,0.85))' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pin-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'pin-bounce': 'pin-bounce 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
}

export default config
