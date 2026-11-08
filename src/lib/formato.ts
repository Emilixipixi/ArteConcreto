// Formato de moneda y fechas. Cambiar LOCALE y MONEDA aqui para ajustar toda la aplicacion.
export const LOCALE = 'es-EC';
export const MONEDA = 'USD';

// useGrouping 'always' fuerza el separador de miles tambien en cifras de 4 digitos ($1.250,00)
const fmtMoneda = new Intl.NumberFormat(LOCALE, {
  style: 'currency', currency: MONEDA, useGrouping: 'always',
} as unknown as Intl.NumberFormatOptions);

export function formatearMoneda(valor: number): string {
  return fmtMoneda.format(valor);
}

export function formatearNumero(valor: number, decimales = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimales, maximumFractionDigits: decimales, useGrouping: 'always',
  } as unknown as Intl.NumberFormatOptions).format(valor);
}

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha dd/mm/aaaa */
export function formatearFecha(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '-';
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Fecha y hora dd/mm/aaaa HH:mm */
export function formatearFechaHora(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '-';
  return `${formatearFecha(d)} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** Tiempo relativo en espanol: "hace 5 min" */
export function tiempoRelativo(iso: string, ahora: number = Date.now()): string {
  const seg = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (seg < 60) return 'hace un momento';
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'dia' : 'dias'}`;
  return formatearFecha(iso);
}

/** Dias enteros transcurridos desde una fecha */
export function diasDesde(iso: string, ahora: number = Date.now()): number {
  return Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 86400000));
}

/** Fecha ISO desplazada N dias/horas respecto de ahora (se usa para las semillas) */
export function hace(dias: number, horas = 0): string {
  return new Date(Date.now() - dias * 86400000 - horas * 3600000).toISOString();
}
export function enDias(dias: number): string {
  return new Date(Date.now() + dias * 86400000).toISOString();
}
