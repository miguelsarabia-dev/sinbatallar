'use client';
// Panel del ESPECIALISTA (modelo inicial): citas disponibles en sus zonas, sus servicios, sus aspirantes,
// sus ganancias (comisión + sueldo semanal) y su perfil.
import { useCallback, useEffect, useState } from 'react';
import { FaChalkboardTeacher, FaInbox, FaTools, FaUserGraduate, FaWallet, FaUserCog, FaBolt } from 'react-icons/fa';
import {
  PanelInicial, Tarjeta, Vacio, Cifra, Boton, Campo, Aviso, EstadoCita, claseInput, api, peso, fecha, nombreDe
} from './comun';
import DetalleCitaEspecialista from './DetalleCitaEspecialista';
import { ChipsSeleccion } from '@/components/ui/ChipsServicios';

const SONDEO_MS = 30000;
const mesActual = () => new Date().toISOString().slice(0, 7);

function Disponibles({ citas, onTomar, ocupado, perfil }) {
  if (perfil && !perfil.aprobado) return <Tarjeta><Vacio>Tu cuenta aún está en revisión: tu asociado debe aprobarla.</Vacio></Tarjeta>;
  if (perfil && perfil.disponible === false) return <Tarjeta><Vacio>Estás en pausa. Reanuda tu disponibilidad en Mi perfil para ver servicios.</Vacio></Tarjeta>;
  if (!citas.length) return <Tarjeta><Vacio>No hay solicitudes abiertas en tus zonas por ahora. Se actualiza cada 30 segundos.</Vacio></Tarjeta>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {citas.map(c => (
        <Tarjeta key={c._id} titulo={c.servicio?.nombre} accion={c.esExpress && <span className="flex items-center gap-1 text-xs font-semibold text-red-600"><FaBolt />Urgente</span>}>
          <p className="text-sm text-gray-700 line-clamp-3">{c.descripcionProblema}</p>
          <p className="text-xs text-gray-500 mt-2">{[c.ubicacion?.colonia, c.ubicacion?.municipio].filter(Boolean).join(', ') || 'Ubicación en tu zona'}</p>
          <p className="text-xs text-gray-500">Solicitada {fecha(c.createdAt, true)}</p>
          <p className="text-sm text-sky-800 bg-sky-50 rounded-md px-2 py-1 mt-1">Visita para cotizar: <strong>{c.fechaVisita ? fecha(c.fechaVisita) : 'a acordar'}</strong>{c.horaVisita ? ` · ${c.horaVisita}` : ''}</p>
          {c.fechaVisita ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Boton disabled={ocupado} onClick={() => onTomar(c, true)}>Tomar y aceptar el día</Boton>
              <Boton variante="secundario" disabled={ocupado} onClick={() => onTomar(c, false)}>Tomar y proponer otro</Boton>
            </div>
          ) : (
            <Boton className="mt-3 w-full" disabled={ocupado} onClick={() => onTomar(c, false)}>Tomar y proponer día</Boton>
          )}
        </Tarjeta>
      ))}
    </div>
  );
}

function MisServicios({ citas, onAbrir }) {
  const [filtro, setFiltro] = useState('activas');
  const lista = citas.filter(c => (filtro === 'activas' ? !['cancelada'].includes(c.estado) && !(c.estado === 'completada' && c.pagado) : filtro === 'cerradas' ? c.estado === 'completada' && c.pagado : c.estado === 'cancelada'));
  return (
    <Tarjeta titulo="Mis servicios" accion={
      <select aria-label="Filtrar servicios" className="text-sm border border-gray-300 rounded-lg px-2 py-1" value={filtro} onChange={e => setFiltro(e.target.value)}>
        <option value="activas">En curso</option><option value="cerradas">Cerrados</option><option value="canceladas">Cancelados</option>
      </select>
    }>
      {!lista.length ? <Vacio>No hay servicios en esta lista.</Vacio> : (
        <ul className="divide-y divide-gray-100">
          {lista.map(c => (
            <li key={c._id}>
              <button onClick={() => onAbrir(c._id)} className="w-full text-left py-3 flex items-center justify-between gap-3 hover:bg-gray-50 px-2 rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.servicio?.nombre} · {c.cliente?.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{c.ubicacion?.colonia || ''} · {c.fechaProgramada ? `inicio ${fecha(c.fechaProgramada)}` : c.fechaVisita ? `visita ${fecha(c.fechaVisita)}${c.horaVisita ? ' ' + c.horaVisita : ''}` : 'sin fecha'} · {(c.aspirantes || []).length} aspirante(s)</p>
                </div>
                <EstadoCita cita={c} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

function Aspirantes({ aspirantes, servicios, onRecargar, onAviso }) {
  const vacio = { nombre: '', email: '', telefono: '', password: '', especialidades: [] };
  const [form, setForm] = useState(vacio);
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const opciones = (servicios || []).map(s => ({ key: s._id, label: s.nombre }));

  const crear = async (e) => {
    e.preventDefault();
    setOcupado(true);
    try {
      await api('/api/inicial/aspirantes', { method: 'POST', body: form });
      onAviso({ tipo: 'ok', texto: `Aspirante ${form.nombre} dado de alta. Ya puede entrar con su correo y la contraseña que le diste.` });
      setForm(vacio); setAbierto(false); onRecargar();
    } catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
    finally { setOcupado(false); }
  };

  const alternar = async (a) => {
    try {
      await api(`/api/inicial/aspirantes/${a._id}`, { method: 'PUT', body: { activo: !a.activo } });
      onRecargar();
    } catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
  };

  return (
    <div className="space-y-4">
      <Tarjeta titulo={`Mis aspirantes (${aspirantes.filter(a => a.activo).length} activos)`} accion={<Boton onClick={() => setAbierto(v => !v)}>{abierto ? 'Cancelar' : 'Dar de alta'}</Boton>}>
        {abierto && (
          <form onSubmit={crear} className="grid gap-3 sm:grid-cols-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <Campo label="Nombre"><input required className={claseInput} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Campo>
            <Campo label="Teléfono"><input required className={claseInput} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Campo>
            <Campo label="Correo"><input required type="email" className={claseInput} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Campo>
            <Campo label="Contraseña temporal" ayuda="Mínimo 6 caracteres. No uses su teléfono ni su correo.">
              <input required minLength={6} type="text" className={claseInput} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </Campo>
            <div className="sm:col-span-2">
              <span className="block text-sm font-medium text-gray-700 mb-1">Qué está aprendiendo</span>
              <ChipsSeleccion opciones={opciones} seleccion={form.especialidades} onChange={k => setForm({ ...form, especialidades: k })} vacio="No tienes servicios asignados." />
            </div>
            <Boton type="submit" disabled={ocupado} className="sm:col-span-2">{ocupado ? 'Guardando…' : 'Dar de alta aspirante'}</Boton>
          </form>
        )}
        {!aspirantes.length ? <Vacio>Aún no tienes aspirantes.</Vacio> : (
          <ul className="divide-y divide-gray-100">
            {aspirantes.map(a => (
              <li key={a._id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-medium ${a.activo ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{nombreDe(a)}</p>
                  <p className="text-xs text-gray-500 truncate">{a.user?.telefono} · {(a.especialidades || []).map(s => s.nombre).join(', ') || 'Sin especialidades'}</p>
                  {a.ascenso?.contratista && <p className="text-xs text-green-700 font-medium">Ascendió a contratista</p>}
                </div>
                {!a.ascenso?.contratista && <Boton variante={a.activo ? 'peligro' : 'secundario'} onClick={() => alternar(a)}>{a.activo ? 'Dar de baja' : 'Reactivar'}</Boton>}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

function Ganancias() {
  const [mes, setMes] = useState(mesActual());
  const [datos, setDatos] = useState(null);
  useEffect(() => { api(`/api/inicial/ganancias?mes=${mes}`).then(setDatos).catch(() => setDatos(null)); }, [mes]);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="mes-ganancias" className="text-sm text-gray-600">Mes</label>
        <input id="mes-ganancias" type="month" className="border border-gray-300 rounded-lg px-2 py-1 text-sm" value={mes} onChange={e => setMes(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Cifra label="Total del mes" valor={peso(datos?.total)} />
        <Cifra label="Comisión por servicios" valor={peso(datos?.porServicios)} nota={`${datos?.servicios?.length || 0} servicio(s) cerrados`} />
        <Cifra label="Sueldo base" valor={peso(datos?.sueldos?.total)} nota={`Pagado: ${peso(datos?.sueldos?.pagado)}`} />
      </div>
      <Tarjeta titulo="Sueldo semanal">
        {!datos?.sueldos?.semanas?.length ? <Vacio>Aún no hay semanas registradas este mes.</Vacio> : (
          <ul className="divide-y divide-gray-100 text-sm">
            {datos.sueldos.semanas.map(s => (
              <li key={s.semana} className="py-2 flex justify-between"><span>Semana del {s.semana}</span><span className="tabular-nums">{peso(s.monto)} · <span className={s.estado === 'pagado' ? 'text-green-700' : 'text-orange-600'}>{s.estado}</span></span></li>
            ))}
          </ul>
        )}
      </Tarjeta>
      <Tarjeta titulo="Comisión por servicio">
        {!datos?.servicios?.length ? <Vacio>Sin servicios cerrados este mes.</Vacio> : (
          <ul className="divide-y divide-gray-100 text-sm">
            {datos.servicios.map(s => (
              <li key={s.cita} className="py-2 flex justify-between gap-3"><span className="truncate">{s.servicio} · {fecha(s.fecha)}</span><span className="tabular-nums">{peso(s.monto)}</span></li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

function Perfil({ perfil, onRecargar, onAviso }) {
  const [pago, setPago] = useState(perfil?.informacionPago || {});
  useEffect(() => { setPago(perfil?.informacionPago || {}); }, [perfil]);
  if (!perfil) return null;
  const guardar = async (body, texto) => {
    try { await api(`/api/inicial/especialistas/${perfil._id}`, { method: 'PUT', body }); onAviso({ tipo: 'ok', texto }); onRecargar(); }
    catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
  };
  return (
    <div className="space-y-4">
      <Tarjeta titulo="Disponibilidad">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700">{perfil.disponible === false ? 'En pausa: no recibes servicios nuevos.' : 'Disponible: ves las solicitudes de tus zonas.'}</p>
          <Boton variante={perfil.disponible === false ? 'primario' : 'secundario'} onClick={() => guardar({ disponible: perfil.disponible === false }, perfil.disponible === false ? 'Ya estás disponible' : 'Quedaste en pausa')}>
            {perfil.disponible === false ? 'Reanudar' : 'Pausar'}
          </Boton>
        </div>
      </Tarjeta>
      <Tarjeta titulo="Mis datos">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500">Asociado</dt><dd>{perfil.asociado?.user?.nombre || '—'}</dd>
          <dt className="text-gray-500">Zonas</dt><dd>{(perfil.areasIds || []).map(z => z.nombre).join(', ') || 'Sin zonas asignadas'}</dd>
          <dt className="text-gray-500">Servicios</dt><dd>{(perfil.servicios || []).map(s => s.nombre).join(', ') || '—'}</dd>
          <dt className="text-gray-500">Sueldo semanal</dt><dd className="tabular-nums">{peso(perfil.sueldoSemanal)}</dd>
          <dt className="text-gray-500">Calificación</dt><dd>{perfil.totalCalificaciones ? `${Number(perfil.promedioCalificacion).toFixed(1)} ★ (${perfil.totalCalificaciones})` : 'Sin calificaciones'}</dd>
        </dl>
        <p className="text-xs text-gray-500 mt-3">Zonas y servicios los asigna tu asociado.</p>
      </Tarjeta>
      <Tarjeta titulo="Datos para tus pagos">
        <form onSubmit={e => { e.preventDefault(); guardar({ informacionPago: { banco: pago.banco || '', clabe: pago.clabe || '', numeroCuenta: pago.numeroCuenta || '', nombreTitular: pago.nombreTitular || '' } }, 'Datos de pago guardados'); }} className="grid gap-3 sm:grid-cols-2">
          <Campo label="Banco"><input className={claseInput} value={pago.banco || ''} onChange={e => setPago({ ...pago, banco: e.target.value })} /></Campo>
          <Campo label="Titular"><input className={claseInput} value={pago.nombreTitular || ''} onChange={e => setPago({ ...pago, nombreTitular: e.target.value })} /></Campo>
          <Campo label="CLABE"><input className={claseInput} value={pago.clabe || ''} onChange={e => setPago({ ...pago, clabe: e.target.value })} /></Campo>
          <Campo label="Número de cuenta"><input className={claseInput} value={pago.numeroCuenta || ''} onChange={e => setPago({ ...pago, numeroCuenta: e.target.value })} /></Campo>
          <Boton type="submit" className="sm:col-span-2">Guardar datos de pago</Boton>
        </form>
      </Tarjeta>
    </div>
  );
}

export default function EspecialistaDashboard() {
  const [seccion, setSeccion] = useState('disponibles');
  const [perfil, setPerfil] = useState(null);
  const [disponibles, setDisponibles] = useState([]);
  const [citas, setCitas] = useState([]);
  const [aspirantes, setAspirantes] = useState([]);
  const [abierta, setAbierta] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const [p, d, c, a] = await Promise.allSettled([
      api('/api/inicial/especialistas'),
      api('/api/inicial/citas?vista=disponibles'),
      api('/api/inicial/citas'),
      api('/api/inicial/aspirantes')
    ]);
    if (p.status === 'fulfilled') setPerfil(p.value[0] || null);
    if (d.status === 'fulfilled') setDisponibles(d.value);
    if (c.status === 'fulfilled') setCitas(c.value);
    if (a.status === 'fulfilled') setAspirantes(a.value);
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, SONDEO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  // aceptarVisita: acepta el día que pidió el cliente; si no, la toma y propone otro día en el detalle
  const tomar = async (cita, aceptarVisita) => {
    setOcupado(true);
    try {
      const r = await api(`/api/inicial/citas/${cita._id}/tomar`, { method: 'POST', body: aceptarVisita ? { aceptarVisita: true } : {} });
      setAviso({ tipo: 'ok', texto: aceptarVisita
        ? 'Servicio tomado y visita acordada: el cliente ya lo sabe. Elige a tus aspirantes.'
        : 'Servicio tomado. Propón al cliente el día de la visita para cotizar.' });
      await cargar();
      setAbierta(r.cita?._id || cita._id);
      setSeccion('servicios');
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
      cargar();
    } finally { setOcupado(false); }
  };

  const enCurso = citas.filter(c => !['cancelada'].includes(c.estado) && !(c.estado === 'completada' && c.pagado)).length;
  const citaAbierta = citas.find(c => c._id === abierta);

  const secciones = [
    { id: 'disponibles', label: 'Disponibles', icono: FaInbox, badge: disponibles.length },
    { id: 'servicios', label: 'Mis servicios', icono: FaTools, badge: enCurso },
    { id: 'aspirantes', label: 'Mis aspirantes', icono: FaUserGraduate },
    { id: 'ganancias', label: 'Mis ganancias', icono: FaWallet },
    { id: 'perfil', label: 'Mi perfil', icono: FaUserCog }
  ];

  return (
    <PanelInicial titulo="Especialista" subtitulo={nombreDe(perfil)} icono={FaChalkboardTeacher} secciones={secciones} activa={seccion}
      onCambiar={(s) => { setSeccion(s); setAbierta(null); }}>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
      {seccion === 'disponibles' && <Disponibles citas={disponibles} onTomar={tomar} ocupado={ocupado} perfil={perfil} />}
      {seccion === 'servicios' && (citaAbierta
        ? <DetalleCitaEspecialista cita={citaAbierta} aspirantesPropios={aspirantes} onVolver={() => setAbierta(null)} onRecargar={cargar} onAviso={setAviso} />
        : <MisServicios citas={citas} onAbrir={setAbierta} />)}
      {seccion === 'aspirantes' && <Aspirantes aspirantes={aspirantes} servicios={perfil?.servicios} onRecargar={cargar} onAviso={setAviso} />}
      {seccion === 'ganancias' && <Ganancias />}
      {seccion === 'perfil' && <Perfil perfil={perfil} onRecargar={cargar} onAviso={setAviso} />}
    </PanelInicial>
  );
}
