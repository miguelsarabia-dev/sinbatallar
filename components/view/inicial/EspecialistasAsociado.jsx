'use client';
// Especialistas del asociado (MODELO INICIAL): alta, aprobación, zonas y servicios.
// También lo usa el admin, que además puede elegir el asociado al dar de alta.
import { useCallback, useEffect, useState } from 'react';
import { FaPlus, FaEdit } from 'react-icons/fa';
import ChipsServicios from '@/components/ui/ChipsServicios';
import SelectorZonas from '@/components/ui/SelectorZonas';
import { Tarjeta, Vacio, Boton, Campo, Aviso, claseInput, api, peso, nombreDe } from './comun';

const VACIO = { nombre: '', email: '', telefono: '', password: '', curp: '', direccion: '', notas: '', servicios: [], areasIds: [] };

function FormAlta({ onCreado, onAviso, asociados }) {
  const [form, setForm] = useState(VACIO);
  const [asociadoId, setAsociadoId] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.servicios.length) { onAviso({ tipo: 'error', texto: 'Elige al menos un servicio' }); return; }
    setOcupado(true);
    try {
      await api('/api/inicial/especialistas', { method: 'POST', body: { ...form, ...(asociadoId ? { asociadoId } : {}) } });
      onAviso({ tipo: 'ok', texto: `${form.nombre} ya es especialista. Puede entrar con su correo y la contraseña temporal.` });
      setForm(VACIO);
      onCreado();
    } catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
    finally { setOcupado(false); }
  };

  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
      <Campo label="Nombre completo"><input required className={claseInput} value={form.nombre} onChange={set('nombre')} /></Campo>
      <Campo label="Teléfono"><input required className={claseInput} value={form.telefono} onChange={set('telefono')} /></Campo>
      <Campo label="Correo"><input required type="email" className={claseInput} value={form.email} onChange={set('email')} /></Campo>
      <Campo label="Contraseña temporal" ayuda="Mínimo 6 caracteres; no uses su CURP, teléfono ni correo.">
        <input required minLength={6} className={claseInput} value={form.password} onChange={set('password')} />
      </Campo>
      <Campo label="CURP (opcional)"><input maxLength={18} className={claseInput} value={form.curp} onChange={set('curp')} /></Campo>
      <Campo label="Dirección (opcional)"><input className={claseInput} value={form.direccion} onChange={set('direccion')} /></Campo>
      {asociados && (
        <Campo label="Asociado">
          <select className={claseInput} value={asociadoId} onChange={e => setAsociadoId(e.target.value)}>
            <option value="">Sin asociado</option>
            {asociados.map(a => <option key={a._id} value={a._id}>{a.user?.nombre || a.user?.email || a._id}</option>)}
          </select>
        </Campo>
      )}
      <div className="sm:col-span-2">
        <span className="block text-sm font-medium text-gray-700 mb-1">Servicios que atiende y enseña</span>
        <ChipsServicios seleccion={form.servicios} onChange={k => setForm({ ...form, servicios: k })} />
      </div>
      <div className="sm:col-span-2"><SelectorZonas seleccion={form.areasIds} onChange={k => setForm({ ...form, areasIds: k })} /></div>
      <Campo label="Notas (opcional)"><input className={claseInput} value={form.notas} onChange={set('notas')} /></Campo>
      <Boton type="submit" disabled={ocupado} className="sm:col-span-2">{ocupado ? 'Guardando…' : 'Dar de alta especialista'}</Boton>
    </form>
  );
}

function Editar({ esp, onListo, onAviso, esAdmin }) {
  const [servicios, setServicios] = useState((esp.servicios || []).map(s => s._id));
  const [areasIds, setAreasIds] = useState((esp.areasIds || []).map(a => a._id));
  const [sueldo, setSueldo] = useState(esp.sueldoSemanal ?? 4500);
  const [ocupado, setOcupado] = useState(false);
  const guardar = async () => {
    setOcupado(true);
    try {
      await api(`/api/inicial/especialistas/${esp._id}`, { method: 'PUT', body: { servicios, areasIds, ...(esAdmin ? { sueldoSemanal: Number(sueldo) } : {}) } });
      onAviso({ tipo: 'ok', texto: 'Cambios guardados' });
      onListo();
    } catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
    finally { setOcupado(false); }
  };
  return (
    <div className="space-y-3 bg-gray-50 rounded-lg p-3 mt-2">
      <div><span className="block text-sm font-medium text-gray-700 mb-1">Servicios</span><ChipsServicios seleccion={servicios} onChange={setServicios} /></div>
      <SelectorZonas seleccion={areasIds} onChange={setAreasIds} />
      {esAdmin && <Campo label="Sueldo semanal (MXN)"><input type="number" min="0" step="1" className={claseInput} value={sueldo} onChange={e => setSueldo(e.target.value)} /></Campo>}
      <div className="flex gap-2"><Boton disabled={ocupado} onClick={guardar}>Guardar</Boton><Boton variante="secundario" onClick={onListo}>Cancelar</Boton></div>
    </div>
  );
}

export default function EspecialistasAsociado({ esAdmin = false, asociados, acciones }) {
  const [lista, setLista] = useState(null);
  const [alta, setAlta] = useState(false);
  const [editando, setEditando] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(() => api('/api/inicial/especialistas').then(setLista).catch(err => { setLista([]); setAviso({ tipo: 'error', texto: err.message }); }), []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = async (esp, body, texto) => {
    try { await api(`/api/inicial/especialistas/${esp._id}`, { method: 'PUT', body }); setAviso({ tipo: 'ok', texto }); cargar(); }
    catch (err) { setAviso({ tipo: 'error', texto: err.message }); }
  };

  return (
    <div className="space-y-4">
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
      <Tarjeta titulo="Nuevo especialista" accion={<Boton variante={alta ? 'secundario' : 'primario'} onClick={() => setAlta(v => !v)}>{alta ? 'Cerrar' : <><FaPlus className="inline mr-1" />Dar de alta</>}</Boton>}>
        {alta ? <FormAlta asociados={esAdmin ? asociados : null} onCreado={() => { setAlta(false); cargar(); }} onAviso={setAviso} />
          : <p className="text-sm text-gray-600">El especialista atiende los servicios de sus zonas y forma a sus aspirantes. Cobra {peso(4500)} semanales más 12% por servicio.</p>}
      </Tarjeta>
      <Tarjeta titulo={`Especialistas (${lista?.filter(e => e.activo).length ?? 0} activos)`}>
        {lista === null ? <Vacio>Cargando…</Vacio> : !lista.length ? <Vacio>Aún no hay especialistas.</Vacio> : (
          <ul className="divide-y divide-gray-100">
            {lista.map(e => (
              <li key={e._id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-medium ${e.activo ? 'text-gray-900' : 'text-gray-400'}`}>
                      {nombreDe(e)}
                      {!e.aprobado && e.activo && <span className="ml-2 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">En revisión</span>}
                      {e.ascenso?.contratista && <span className="ml-2 text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">Ascendió a contratista</span>}
                      {!e.activo && !e.ascenso?.contratista && <span className="ml-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">Baja</span>}
                    </p>
                    <p className="text-xs text-gray-500">{e.user?.email} · {e.user?.telefono}{esAdmin && e.asociado?.user?.nombre ? ` · asociado: ${e.asociado.user.nombre}` : ''}</p>
                    <p className="text-xs text-gray-500">Zonas: {(e.areasIds || []).map(z => z.nombre).join(', ') || 'ninguna'} · Servicios: {(e.servicios || []).map(s => s.nombre).join(', ') || 'ninguno'}</p>
                    {esAdmin && <p className="text-xs text-gray-500 tabular-nums">Sueldo semanal: {peso(e.sueldoSemanal)}</p>}
                  </div>
                  {!e.ascenso?.contratista && (
                    <div className="flex flex-wrap gap-2">
                      <Boton variante="secundario" onClick={() => setEditando(editando === e._id ? null : e._id)}><FaEdit className="inline mr-1" />Editar</Boton>
                      {e.activo && <Boton variante={e.aprobado ? 'secundario' : 'primario'} onClick={() => cambiar(e, { aprobado: !e.aprobado }, e.aprobado ? 'Especialista en revisión: no recibirá servicios' : 'Especialista aprobado')}>{e.aprobado ? 'Pasar a revisión' : 'Aprobar'}</Boton>}
                      {esAdmin && <Boton variante={e.activo ? 'peligro' : 'secundario'} onClick={() => cambiar(e, { activo: !e.activo }, e.activo ? 'Especialista dado de baja' : 'Especialista reactivado')}>{e.activo ? 'Dar de baja' : 'Reactivar'}</Boton>}
                      {acciones?.(e, cargar, setAviso)}
                    </div>
                  )}
                </div>
                {editando === e._id && <Editar esp={e} esAdmin={esAdmin} onAviso={setAviso} onListo={() => { setEditando(null); cargar(); }} />}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
