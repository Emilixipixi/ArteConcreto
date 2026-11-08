// Avatar hexagonal con iniciales (motivo del hexagono usado con moderacion)
export default function AvatarHex({ nombre, tam = 36 }: { nombre: string; tam?: number }) {
  const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: tam, height: tam * 1.1 }}>
      <svg viewBox="0 0 48 52" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <polygon points="24,2 45,14 45,38 24,50 3,38 3,14" fill="#F2B705" />
      </svg>
      <span className="relative font-titulos font-bold text-marca-vino-oscuro" style={{ fontSize: tam * 0.36 }}>{iniciales}</span>
    </span>
  );
}
