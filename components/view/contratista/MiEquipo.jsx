'use client';
// Técnicos del contratista. Al crear uno, sus especialidades son chips con los servicios que el incorporador
// le asignó al contratista (no se escriben a mano).
import { useState, useEffect, useCallback } from 'react';
import { ChipsSeleccion } from '../../ui/ChipsServicios';

const VACIO = { nombre: '', email: '', password: '', telefono: '' };

export default function MiEquipo({ contratistaId, servicios = [] }) {
  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [especialidades, setEspecialidades] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    if (!contratistaId) return;
    try {
      const res = await fetch(`/api/tecnicos?contratistaId=${contratistaId}`);
      setTecnicos(res.ok ? await res.json() : []);
    } catch { setTecnicos([]); } finally { setCargando(false); }
  }, [contratistaId]);
  useEffect(() => { cargar(); }, [cargar]);

  const opciones = servicios.map(s => ({ key: s.nombre, label: s.nombre }));

  const crear = async (e) => {
    e.preventDefault();
    setMensaje(null);
    if (!form.nombre || !form.email || form.password.length < 6) {
      setMensaje({ tipo: 'error', texto: 'Nombre, email y contraseña (mín. 6) son obligatorios.' });
      return;
    }
    if (opciones.length > 0 && especialidades.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Elige al menos una especialidad para el técnico.' });
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch('/api/tecnicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, especialidades })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo crear el técnico');
      setForm(VACIO); setEspecialidades([]); setMostrarForm(false);
      setMensaje({ tipo: 'ok', texto: 'Técnico creado y asignado a tu equipo.' });
      cargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally { setGuardando(false); }
  };

  const campo = (clave, etiqueta, tipo = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{etiqueta}</label>
      <input
        type={tipo}
        value={form[clave]}
        onChange={(e) => setForm({ ...form, [clave]: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Mi equipo</h3>
        <button type="button" onClick={() => setMostrarForm(v => !v)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold">
          {mostrarForm ? 'Cancelar' : 'Agregar técnico'}
        </button>
      </div>

      {mensaje && (
        <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{mensaje.texto}</p>
      )}

      {mostrarForm && (
        <form onSubmit={crear} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {campo('nombre', 'Nombre *')}
            {campo('email', 'Email *', 'email')}
            {campo('password', 'Contraseña * (mín. 6)', 'password')}
            {campo('telefono', 'Teléfono', 'tel')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Especialidades del técnico *</label>
            <ChipsSeleccion
              opciones={opciones}
              seleccion={especialidades}
              onChange={setEspecialidades}
              vacio="Aún no tienes servicios asignados. Tu incorporador debe asignártelos para poder elegir especialidades."
            />
          </div>
          <button type="submit" disabled={guardando} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            {guardando ? 'Creando...' : 'Crear técnico'}
          </button>
        </form>
      )}

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : tecnicos.length === 0 ? (
        <p className="text-sm text-gray-500">Aún no tienes técnicos.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {tecnicos.map(t => (
            <li key={t._id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{t.user?.nombre}</p>
                <p className="text-sm text-gray-500">{t.user?.email}</p>
                {t.especialidades?.length > 0 && <p className="text-xs text-gray-600 mt-1">{t.especialidades.join(', ')}</p>}
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${t.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {t.activo ? 'Activo' : 'Inactivo'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
