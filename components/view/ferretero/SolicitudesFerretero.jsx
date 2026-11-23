'use client';
// Solicitudes de material que le llegan al ferretero (automáticas al verificarse el anticipo, o pedidas por el
// contratista/técnico). Antes el aviso era solo por email; aquí las ve, se actualizan cada 30 s y las responde:
// pendiente -> confirmada -> surtida, o cancelada con motivo (PATCH /api/solicitudes-materiales/[id]).
import { useState, useEffect, useCallback } from 'react';
import { FaShoppingCart, FaCheck, FaTruck, FaTimes, FaPhoneAlt, FaMapMarkerAlt, FaUser, FaCalendarAlt } from 'react-icons/fa';

const peso = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ESTADOS = {
  pendiente: { label: 'Pendiente', clase: 'bg-amber-100 text-amber-700' },
  confirmada: { label: 'Confirmada', clase: 'bg-blue-100 text-blue-700' },
  surtida: { label: 'Surtida', clase: 'bg-green-100 text-green-700' },
  cancelada: { label: 'Cancelada', clase: 'bg-red-100 text-red-700' },
};

const FILTROS = [['pendiente', 'Pendientes'], ['confirmada', 'Confirmadas'], ['', 'Todas']];

function direccionDe(u) {
  if (!u) return '';
  if (u.direccion?.trim()) return u.direccion.trim();
  return [u.calle, u.numeroCasa ? `#${u.numeroCasa}` : '', u.colonia, u.municipio || u.ciudad, u.estado, u.codigoPostal]
    .filter(Boolean).join(', ');
}

export default function SolicitudesFerretero({ showSuccess, showError, onPendientes }) {
  const [solicitudes, setSolicitudes] = useState(null);
  const [filtro, setFiltro] = useState('pendiente');
  const [ocupado, setOcupado] = useState(null);
  const [cancelando, setCancelando] = useState(null); // id de la solicitud con el motivo abierto
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/solicitudes-materiales');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      const lista = Array.isArray(data) ? data : [];
      setSolicitudes(lista);
      onPendientes?.(lista.filter(s => s.estado === 'pendiente').length);
    } catch (e) {
      console.error('Error cargando solicitudes de material:', e);
    }
  }, [onPendientes]);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 30000);
    return () => clearInterval(intervalo);
  }, [cargar]);

  const cambiarEstado = async (sol, estado, motivoCancelacion) => {
    setOcupado(sol._id);
    try {
      const res = await fetch(`/api/solicitudes-materiales/${sol._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, ...(motivoCancelacion ? { motivoCancelacion } : {}) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo actualizar la solicitud');
      setCancelando(null);
      setMotivo('');
      showSuccess?.(
        estado === 'confirmada' ? 'Solicitud confirmada. El contratista y el técnico ya lo saben.'
          : estado === 'surtida' ? 'Solicitud marcada como surtida.'
            : 'Solicitud cancelada.'
      );
      await cargar();
    } catch (e) {
      showError?.(e.message);
    } finally {
      setOcupado(null);
    }
  };

  const visibles = (solicitudes || []).filter(s => !filtro || s.estado === filtro);
  const cuenta = (estado) => (solicitudes || []).filter(s => s.estado === estado).length;

  return (
    <section id="solicitudes" className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <FaShoppingCart className="text-primary" />
          <h3 className="text-base font-bold text-gray-900">Solicitudes de material</h3>
          {cuenta('pendiente') > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{cuenta('pendiente')} nueva(s)</span>
          )}
        </div>
        <div className="flex gap-2">
          {FILTROS.map(([valor, etiqueta]) => (
            <button
              key={etiqueta}
              onClick={() => setFiltro(valor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filtro === valor ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {etiqueta}{valor ? ` (${cuenta(valor)})` : ''}
            </button>
          ))}
        </div>
      </div>

      {solicitudes === null ? (
        <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          {filtro === 'pendiente' ? 'No tienes solicitudes pendientes. Esta lista se actualiza sola.' : 'No hay solicitudes en este filtro.'}
        </p>
      ) : (
        <div className="space-y-3">
          {visibles.map(sol => {
            const meta = ESTADOS[sol.estado] || ESTADOS.pendiente;
            const direccion = direccionDe(sol.cita?.ubicacion);
            const telefono = sol.tecnico?.telefono || sol.contratista?.telefono;
            return (
              <div key={sol._id} className={`rounded-xl border p-4 ${sol.estado === 'pendiente' ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{sol.cita?.servicio?.nombre || 'Solicitud de material'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(sol.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                      {sol.origen === 'automatica' ? ' · generada al verificarse el anticipo' : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${meta.clase}`}>{meta.label}</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                  {sol.contratista?.nombre && (
                    <p className="flex items-center gap-2"><FaUser size={12} className="text-gray-400" /> {sol.contratista.nombre}{sol.tecnico?.nombre ? ` · técnico ${sol.tecnico.nombre}` : ''}</p>
                  )}
                  {telefono && (
                    <a href={`tel:${telefono}`} className="flex items-center gap-2 text-green-700 hover:underline"><FaPhoneAlt size={12} /> {telefono}</a>
                  )}
                  {direccion && (
                    <p className="flex items-center gap-2 sm:col-span-2"><FaMapMarkerAlt size={12} className="text-gray-400" /> {direccion}</p>
                  )}
                  {sol.fechaRequerida && (
                    <p className="flex items-center gap-2"><FaCalendarAlt size={12} className="text-gray-400" /> Para el {new Date(sol.fechaRequerida).toLocaleDateString('es-MX')}</p>
                  )}
                  <p className="flex items-center gap-2"><FaTruck size={12} className="text-gray-400" /> {sol.modoEntrega === 'entregar' ? 'Entregar en obra' : 'Pasan a recoger'}</p>
                </div>

                <div className="border-t border-gray-100 pt-2 mb-3">
                  {(sol.items || []).map((it, i) => (
                    <div key={it._id || i} className="flex justify-between text-sm py-0.5">
                      <span className="text-gray-700">{it.cantidad} {it.unidad || ''} · {it.nombre}</span>
                      <span className="text-gray-900">{peso((it.precio || 0) * (it.cantidad || 0))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-100 mt-1">
                    <span>Total</span><span>{peso(sol.total)}</span>
                  </div>
                </div>

                {sol.estado === 'cancelada' && sol.motivoCancelacion && (
                  <p className="text-xs text-red-600 mb-2">Motivo: {sol.motivoCancelacion}</p>
                )}

                {cancelando === sol._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={motivo}
                      onChange={e => setMotivo(e.target.value)}
                      placeholder="¿Por qué la cancelas? (el contratista y el técnico lo verán)"
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => cambiarEstado(sol, 'cancelada', motivo.trim())}
                        disabled={!motivo.trim() || ocupado === sol._id}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                      >
                        Confirmar cancelación
                      </button>
                      <button onClick={() => { setCancelando(null); setMotivo(''); }} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                        Volver
                      </button>
                    </div>
                  </div>
                ) : (sol.estado === 'pendiente' || sol.estado === 'confirmada') && (
                  <div className="flex flex-wrap gap-2">
                    {sol.estado === 'pendiente' ? (
                      <button
                        onClick={() => cambiarEstado(sol, 'confirmada')}
                        disabled={ocupado === sol._id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        <FaCheck size={12} /> Confirmar pedido
                      </button>
                    ) : (
                      <button
                        onClick={() => cambiarEstado(sol, 'surtida')}
                        disabled={ocupado === sol._id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        <FaTruck size={12} /> Marcar como surtida
                      </button>
                    )}
                    <button
                      onClick={() => { setCancelando(sol._id); setMotivo(''); }}
                      disabled={ocupado === sol._id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
                    >
                      <FaTimes size={12} /> Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
