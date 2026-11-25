'use client';
// Piezas compartidas por las pantallas del MODELO INICIAL (especialista, aspirante, asociado y admin).
import { useState } from 'react';
import { signOut } from '@/contexts/AuthContext';
import { FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';

export const peso = (n) => {
  const v = Number(n || 0);
  return `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fecha = (f, conHora = false) => {
  if (!f) return '—';
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}) });
};

export const nombreDe = (perfil) => perfil?.user?.nombre || perfil?.nombre || '—';

/** fetch JSON que lanza Error con el mensaje del servidor. */
export async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || 'Ocurrió un error');
  return data;
}

const ESTADOS = {
  solicitada: { label: 'Abierta', clase: 'bg-sky-100 text-sky-700' },
  atendida: { label: 'Por cotizar', clase: 'bg-amber-100 text-amber-700' },
  cotizada: { label: 'Cotizada', clase: 'bg-violet-100 text-violet-700' },
  aceptada: { label: 'Aceptada', clase: 'bg-blue-100 text-blue-700' },
  verificando_pago: { label: 'Verificando pago', clase: 'bg-orange-100 text-orange-700' },
  en_progreso: { label: 'En progreso', clase: 'bg-indigo-100 text-indigo-700' },
  completada: { label: 'Terminada', clase: 'bg-green-100 text-green-700' },
  cancelada: { label: 'Cancelada', clase: 'bg-red-100 text-red-700' },
  rechazada: { label: 'Rechazada', clase: 'bg-gray-200 text-gray-700' }
};

export function EstadoCita({ cita }) {
  const e = ESTADOS[cita?.estado] || { label: cita?.estado || '—', clase: 'bg-gray-100 text-gray-700' };
  const label = cita?.estado === 'completada' && cita?.pagado ? 'Cerrada' : e.label;
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${e.clase}`}>{label}</span>;
}

export const SUBESTADO_LABEL = { en_camino: 'En camino', en_sitio: 'En sitio', cotizando: 'Cotizando', trabajando: 'Trabajando' };

export function direccionDe(u) {
  if (!u) return '';
  return [u.calle, u.numeroCasa ? `#${u.numeroCasa}` : '', u.colonia, u.municipio, u.estado, u.codigoPostal].filter(Boolean).join(', ');
}

export function Tarjeta({ titulo, accion, children, className = '' }) {
  return (
    <section className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {(titulo || accion) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          {titulo && <h3 className="font-semibold text-gray-900">{titulo}</h3>}
          {accion}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Vacio({ children }) {
  return <p className="text-sm text-gray-500 italic py-6 text-center">{children}</p>;
}

export function Cifra({ label, valor, nota }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{valor}</p>
      {nota && <p className="text-xs text-gray-500 mt-1">{nota}</p>}
    </div>
  );
}

export function Boton({ children, onClick, variante = 'primario', disabled, type = 'button', className = '' }) {
  const estilos = {
    primario: 'bg-primary text-white hover:bg-primary/90',
    secundario: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    peligro: 'bg-white border border-red-300 text-red-600 hover:bg-red-50'
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}>
      {children}
    </button>
  );
}

export function Campo({ label, children, ayuda }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {ayuda && <span className="block text-xs text-gray-500 mt-1">{ayuda}</span>}
    </label>
  );
}

export const claseInput = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm';

/** Mensaje breve arriba de la pantalla (éxito o error). */
export function Aviso({ aviso, onCerrar }) {
  if (!aviso) return null;
  const clase = aviso.tipo === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700';
  return (
    <div role="status" className={`flex items-start justify-between gap-3 border rounded-lg px-4 py-3 text-sm ${clase}`}>
      <span>{aviso.texto}</span>
      <button onClick={onCerrar} aria-label="Cerrar aviso" className="opacity-70 hover:opacity-100"><FaTimes /></button>
    </div>
  );
}

/** Layout con barra lateral para los paneles del modelo inicial. */
export function PanelInicial({ titulo, subtitulo, icono: Icono, secciones, activa, onCambiar, children }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {abierto && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setAbierto(false)} />}
      <aside className={`${abierto ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:static flex flex-col`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">{Icono && <Icono className="text-white" />}</div>
            <div>
              <p className="font-bold text-gray-900 leading-tight">{titulo}</p>
              {subtitulo && <p className="text-xs text-gray-500 leading-tight">{subtitulo}</p>}
            </div>
          </div>
          <button className="lg:hidden text-gray-500" onClick={() => setAbierto(false)} aria-label="Cerrar menú"><FaTimes /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {secciones.map(s => (
            <button key={s.id} onClick={() => { onCambiar(s.id); setAbierto(false); }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${activa === s.id ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
              <span className="flex items-center gap-3">{s.icono && <s.icono />}{s.label}</span>
              {s.badge > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">{s.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
            <FaSignOutAlt /> Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-3 px-4 lg:px-6">
          <button className="lg:hidden text-gray-600" onClick={() => setAbierto(true)} aria-label="Abrir menú"><FaBars size={20} /></button>
          <h2 className="text-lg font-bold text-gray-900">{secciones.find(s => s.id === activa)?.label}</h2>
        </header>
        <main className="flex-1 p-4 lg:p-6 space-y-4">{children}</main>
      </div>
    </div>
  );
}
