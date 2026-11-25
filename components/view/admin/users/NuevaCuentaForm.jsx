"use client";
// Alta de una cuenta de CUALQUIER rol por el admin (POST /api/admin/cuentas). La cuenta queda aprobada y activa.
import { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

const VACIO = { rol: 'cliente', nombre: '', email: '', telefono: '', password: '', contratistaId: '', especialistaId: '', asociadoId: '', nombreNegocio: '' };
const ETIQUETA_RELACION = { contratistaId: 'Contratista', especialistaId: 'Especialista', asociadoId: 'Asociado' };
const LISTA_RELACION = { contratistaId: 'contratistas', especialistaId: 'especialistas', asociadoId: 'asociados' };
const input = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary';

export default function NuevaCuentaForm({ onClose, onCreada, showError }) {
  const [opciones, setOpciones] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch('/api/admin/cuentas')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setOpciones)
      .catch(() => showError('No se pudieron cargar los roles'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showError cambia en cada render del panel; basta cargar al abrir
  }, []);

  const def = opciones?.roles.find(r => r.rol === form.rol);
  const campoRelacion = def?.requiere || def?.opcional;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const body = {
        rol: form.rol, nombre: form.nombre, email: form.email, telefono: form.telefono, password: form.password,
        ...(campoRelacion && form[campoRelacion] ? { [campoRelacion]: form[campoRelacion] } : {}),
        ...(def?.negocio ? { nombreNegocio: form.nombreNegocio } : {}),
      };
      const res = await fetch('/api/admin/cuentas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la cuenta');
      onCreada(data.cuenta, def?.etiqueta);
    } catch (err) {
      showError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Nueva cuenta</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors" aria-label="Cerrar">
            <FaTimes size={20} />
          </button>
        </div>

        {!opciones ? <p className="text-sm text-gray-500">Cargando…</p> : (
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value, contratistaId: '', especialistaId: '', asociadoId: '' })} className={input}>
                {opciones.roles.map(r => <option key={r.rol} value={r.rol}>{r.etiqueta}</option>)}
              </select>
            </div>

            {campoRelacion && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ETIQUETA_RELACION[campoRelacion]} {def.requiere ? '*' : '(opcional)'}
                </label>
                <select value={form[campoRelacion]} onChange={set(campoRelacion)} className={input} required={!!def.requiere}>
                  <option value="">{def.requiere ? 'Elige uno' : 'Sin asignar'}</option>
                  {opciones[LISTA_RELACION[campoRelacion]].map(o => <option key={o._id} value={o._id}>{o.nombre}{o.email ? ` · ${o.email}` : ''}</option>)}
                </select>
                {!opciones[LISTA_RELACION[campoRelacion]].length && (
                  <p className="text-xs text-amber-700 mt-1">Aún no hay {LISTA_RELACION[campoRelacion]}: crea primero uno.</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" value={form.nombre} onChange={set('nombre')} className={input} required />
            </div>
            {def?.negocio && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la ferretería</label>
                <input type="text" value={form.nombreNegocio} onChange={set('nombreNegocio')} placeholder="Si lo dejas vacío se usa el nombre" className={input} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={set('email')} className={input} required autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (10 dígitos) *</label>
              <input type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={input} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña temporal *</label>
              <input type="text" value={form.password} onChange={set('password')} className={input} required minLength={6} autoComplete="new-password" />
              <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres. Compártela con la persona para que entre.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={guardando} className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50">
                {guardando ? 'Creando…' : 'Crear cuenta'}
              </button>
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
