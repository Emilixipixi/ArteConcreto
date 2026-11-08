import { useState, type FormEvent } from 'react';
import { ArrowRight, Boxes, Eye, EyeOff, FileCheck2, Lock, Mail, PackageCheck, ShieldCheck, TrendingUp, Truck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AvatarHex from '../components/AvatarHex';
import ChipsRoles from '../components/ChipsRoles';
import InsigniaSimulado from '../components/InsigniaSimulado';
import Logo from '../components/Logo';
import { useStore } from '../store/useStore';
import { useUsuarioActual } from '../store/selectores';

// SUPUESTO: la clave de demostracion es unica para todos los usuarios y no se valida contra ningun servidor.
const CLAVE_DEMO = 'demo1234';

// Beneficios que se muestran al pie del panel izquierdo
const BENEFICIOS = [
  { icono: Boxes, titulo: 'Inventario por bodega', texto: 'Existencias físicas, comprometidas y disponibles' },
  { icono: FileCheck2, titulo: 'Compras con trazabilidad', texto: 'De la solicitud al pago y la recepción' },
  { icono: Truck, titulo: 'Despachos y tienda en línea', texto: 'Cada salida queda registrada una sola vez' },
];

// P-01 Inicio de sesion: formulario de demostracion + cuentas de prueba
export default function Login() {
  const usuario = useUsuarioActual();
  const usuarios = useStore((s) => s.usuarios).filter((u) => u.activo);
  const cambiarUsuario = useStore((s) => s.cambiarUsuario);
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const desde = (ubicacion.state as { desde?: string } | null)?.desde ?? '/';

  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');

  if (usuario) return <Navigate to="/" replace />; // sesion guardada

  const entrar = (id: string) => { cambiarUsuario(id); navigate(desde, { replace: true }); };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const u = usuarios.find((x) => x.correo.toLowerCase() === correo.trim().toLowerCase());
    if (!u) { setError('No encontramos una cuenta activa con ese correo. Usa una cuenta de prueba.'); return; }
    if (clave !== CLAVE_DEMO) { setError(`Clave incorrecta. En la demostración la clave es ${CLAVE_DEMO}.`); return; }
    entrar(u.id);
  };

  // Al elegir una cuenta de prueba se completa el formulario y se entra
  const elegir = (id: string) => entrar(id);

  return (
    <div className="grid min-h-[calc(100vh-1.75rem)] lg:grid-cols-[1.15fr_1fr]">
      {/* Panel de marca (solo escritorio) */}
      <section className="relative hidden overflow-hidden bg-[#1c0a14] text-white lg:flex lg:flex-col lg:justify-between lg:p-12" aria-hidden="false">
        <div className="pointer-events-none absolute -left-32 top-24 h-[28rem] w-[28rem] rounded-full bg-marca-vino/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-marca-amarillo/15 blur-3xl" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true">
          <defs><pattern id="rejilla" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" strokeWidth="1" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#rejilla)" />
        </svg>

        <div className="relative"><Logo variante="blanco" /></div>

        <div className="relative max-w-xl self-center">
          <h2 className="!text-white text-5xl font-bold leading-tight">
            Cada material,<br /><span className="text-marca-amarillo">cada pieza</span>, bajo control.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/70">
            Sigue el mobiliario de concreto de principio a fin: solicitudes, compras, pagos, fabricación, existencias y despachos en un mismo lugar.
          </p>

          {/* Tarjeta ilustrativa (no son datos reales) */}
          <div className="relative mt-12 w-[26rem]">
            <div className="absolute -right-10 -top-6 z-10 flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400/20 text-emerald-300"><PackageCheck size={16} aria-hidden="true" /></span>
              <span className="text-xs"><b className="block">Despacho confirmado</b><span className="text-white/60">Bancas BC-01 · 4 unidades</span></span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Existencias disponibles</p>
                  <p className="mt-1 text-3xl font-bold">1.248 <span className="text-sm font-medium text-white/60">uds</span></p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-medium text-emerald-300"><TrendingUp size={12} aria-hidden="true" /> +9 %</span>
              </div>
              <svg viewBox="0 0 320 90" className="mt-4 h-24 w-full" role="img" aria-label="Gráfico ilustrativo de existencias">
                <defs><linearGradient id="relleno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2B705" stopOpacity="0.35" /><stop offset="1" stopColor="#F2B705" stopOpacity="0" /></linearGradient></defs>
                <path d="M0 70 C40 60 60 40 100 48 S170 30 210 38 S280 20 320 14 V90 H0Z" fill="url(#relleno)" />
                <path d="M0 70 C40 60 60 40 100 48 S170 30 210 38 S280 20 320 14" fill="none" stroke="#F2B705" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M0 78 C50 74 90 66 130 66 S210 60 250 56 S300 50 320 46" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="4 4" />
              </svg>
              <div className="mt-2 flex gap-4 text-[11px] text-white/60">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-marca-amarillo" />Disponible</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/50" />Comprometido</span>
              </div>
            </div>
            <div className="absolute -bottom-10 -left-8 flex items-center gap-3 rounded-xl border border-white/10 bg-[#2a1220] px-3 py-2">
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="4" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="#F2B705" strokeWidth="4" strokeLinecap="round" strokeDasharray="72 100.5" transform="rotate(-90 20 20)" />
              </svg>
              <span className="text-xs"><b className="block text-sm">72 %</b><span className="text-white/60">Pedidos atendidos</span></span>
            </div>
          </div>
          <p className="mt-16 text-[11px] text-white/40">Vista ilustrativa. Las cifras de esta tarjeta no provienen del inventario.</p>
        </div>

        <ul className="relative grid grid-cols-3 gap-6">
          {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo} className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/5 text-marca-amarillo"><Icono size={16} aria-hidden="true" /></span>
              <span className="text-xs"><b className="block text-sm">{titulo}</b><span className="text-white/60">{texto}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {/* Panel de acceso */}
      <section className="flex flex-col items-center justify-center bg-fondo px-4 py-8 sm:px-8">
        <div className="mb-6 lg:hidden"><Logo /></div>
        <div className="w-full max-w-xl rounded-3xl border border-concreto-300/60 bg-superficie p-6 shadow-xl sm:p-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" /> Acceso de demostración
          </span>
          <h1 className="mt-4 text-2xl font-bold">Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm text-concreto-600">Ingresa con una cuenta de prueba para continuar.</p>

          <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="correo" className="mb-1.5 block text-sm font-medium">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-concreto-600" aria-hidden="true" />
                <input id="correo" type="email" autoComplete="username" className="campo !py-2.5 !pl-9" placeholder="nombre@arteconcreto.test"
                  value={correo} onChange={(e) => { setCorreo(e.target.value); setError(''); }} />
              </div>
            </div>
            <div>
              <label htmlFor="clave" className="mb-1.5 block text-sm font-medium">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-concreto-600" aria-hidden="true" />
                <input id="clave" type={ver ? 'text' : 'password'} autoComplete="current-password" className="campo !py-2.5 !pl-9 !pr-10" placeholder="••••••••"
                  value={clave} onChange={(e) => { setClave(e.target.value); setError(''); }} />
                <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-concreto-600 hover:text-marca-vino">
                  {ver ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
            <button type="submit" className="btn-primario flex w-full items-center justify-center gap-2 !py-2.5">
              Continuar <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-concreto-600">
            <span className="h-px flex-1 bg-concreto-300" /> Cuentas de prueba <span className="h-px flex-1 bg-concreto-300" />
          </div>
          <ul className="mt-3 grid max-h-[26rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:max-h-none sm:grid-cols-2 sm:overflow-visible sm:pr-0">
            {usuarios.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => elegir(u.id)} title={u.descripcion}
                  className="flex h-full w-full items-center gap-2.5 rounded-lg border border-concreto-300 bg-superficie p-2.5 text-left transition hover:border-marca-vino hover:shadow-md">
                  <AvatarHex nombre={u.nombre} tam={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{u.nombre}</span>
                    <span className="mt-1 block [&_*]:whitespace-nowrap"><ChipsRoles roles={u.roles} /></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-xs text-concreto-600">Clave <b className="font-mono text-texto">{CLAVE_DEMO}</b> · o toca una cuenta para entrar directo</p>
          <div className="mt-4 flex justify-center"><InsigniaSimulado texto="Prototipo navegable" /></div>
        </div>
        <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-concreto-600">
          <ShieldCheck size={13} aria-hidden="true" /> En la versión real se usará usuario y contraseña propios.
        </p>
      </section>
    </div>
  );
}
