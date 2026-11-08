/** @type {import('tailwindcss').Config} */
// Los colores salen de variables CSS (src/index.css) para ajustarlos en un solo lugar.
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'marca-vino': c('marca-vino'),
        'marca-vino-oscuro': c('marca-vino-oscuro'),
        'marca-amarillo': c('marca-amarillo'),
        'marca-amarillo-suave': c('marca-amarillo-suave'),
        fondo: c('fondo'),
        superficie: c('superficie'),
        'concreto-100': c('concreto-100'),
        'concreto-300': c('concreto-300'),
        'concreto-600': c('concreto-600'),
        texto: c('texto'),
        ok: c('ok'),
        aviso: c('aviso'),
        error: c('error'),
        info: c('info'),
      },
      fontFamily: {
        titulos: ['var(--fuente-titulos)'],
        cuerpo: ['var(--fuente-cuerpo)'],
      },
      boxShadow: { suave: '0 1px 2px rgba(42,38,35,0.06), 0 2px 8px rgba(42,38,35,0.04)' },
      borderRadius: { md: '6px', lg: '8px' },
    },
  },
  plugins: [],
};
