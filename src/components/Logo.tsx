// Logotipo recreado en SVG (si existe public/logo.png se puede reemplazar por <img src="/logo.png">).
interface Props { variante?: 'color' | 'blanco'; mostrarTexto?: boolean; className?: string }

export default function Logo({ variante = 'color', mostrarTexto = true, className = '' }: Props) {
  const blanco = variante === 'blanco';
  const hex = blanco ? '#FFFFFF' : '#F2B705';
  const flecha = blanco ? '#4A1428' : '#6B1F3B';
  const texto = blanco ? '#FFFFFF' : '#6B1F3B';
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="40" height="44" viewBox="0 0 48 52" aria-hidden="true">
        <polygon points="24,2 45,14 45,38 24,50 3,38 3,14" fill={hex} />
        <polygon points="24,2 45,14 24,26 3,14" fill="#000" opacity="0.08" />
        <path d="M15 33 L30 18 M21 18 H30 V27" fill="none" stroke={flecha} strokeWidth="4.5" strokeLinecap="square" />
      </svg>
      {mostrarTexto && (
        <div className="leading-none">
          <div className="text-[22px]" style={{ fontFamily: 'var(--fuente-titulos)', color: texto }}>
            <span style={{ fontWeight: 400 }}>Arte</span><span style={{ fontWeight: 700 }}>concreto</span>
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.35em]" style={{ color: texto, opacity: 0.8 }}>mobiliario</div>
        </div>
      )}
    </div>
  );
}
