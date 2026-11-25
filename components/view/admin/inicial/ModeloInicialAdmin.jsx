'use client';
// Admin › Modelo inicial: interruptor del permanente, parámetros financieros, especialistas, aspirantes,
// servicios, sueldos semanales, cierre mensual y ascensos a contratista.
import { useCallback, useEffect, useState } from 'react';
import { Tarjeta, Vacio, Cifra, Boton, Campo, Aviso, EstadoCita, claseInput, api, peso, fecha, nombreDe } from '../../inicial/comun';
import EspecialistasAsociado from '../../inicial/EspecialistasAsociado';

const mesActual = () => new Date().toISOString().slice(0, 7);
function lunesDeHoy() {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() - ((utc.getUTCDay() + 6) % 7));
  return utc.toISOString().slice(0, 10);
}

const PESTANAS = [
  ['resumen', 'Configuración'], ['especialistas', 'Especialistas'], ['aspirantes', 'Aspirantes'],
  ['servicios', 'Servicios'], ['sueldos', 'Sueldos'], ['cierre', 'Cierre mensual']
];

const PARAMETROS = [
  ['OPERACION_SB', 'Operación Sin Batallar', '%'], ['OPERACION_ASOCIADO', 'Operación asociado', '%'],
  ['ESPECIALISTA', 'Especialista', '%'], ['ASPIRANTES', 'Aspirantes (entre los que van)', '%'],
  ['APERTURADOR', 'Aperturador', '%'], ['PARTICIPACION_ASOCIADO', 'Asociado en el remanente', '%'],
  ['GARANTIA_APERTURADOR', 'Garantía mensual del aperturador', 'MXN'], ['SUELDO_SEMANAL', 'Sueldo semanal por defecto', 'MXN']
];

function Configuracion({ onAviso }) {
  const [modelos, setModelos] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [version, setVersion] = useState('');
  const cargar = useCallback(async () => {
    const [m, c] = await Promise.all([api('/api/admin/modelos'), api('/api/admin/configuracion-financiera-inicial')]);
    setModelos(m); setCfg(c.config); setVersion(c.version);
  }, []);
  useEffect(() => { cargar().catch(err => onAviso({ tipo: 'error', texto: err.message })); }, [cargar, onAviso]);

  const alternarPermanente = async () => {
    const activar = !modelos.permanenteActivo;
    const texto = activar
      ? '¿Activar el modelo permanente? Los contratistas empezarán a recibir solicitudes junto con los especialistas.'
      : '¿Apagar el modelo permanente? Los contratistas dejarán de recibir solicitudes nuevas (las que ya tienen siguen su curso).';
    if (!window.confirm(texto)) return;
    try { setModelos(await api('/api/admin/modelos', { method: 'PUT', body: { permanenteActivo: activar } })); onAviso({ tipo: 'ok', texto: activar ? 'Modelo permanente activado' : 'Modelo permanente apagado' }); }
    catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
  };

  const guardar = async (e) => {
    e.preventDefault();
    const valores = Object.fromEntries(PARAMETROS.map(([k]) => [k, Number(cfg[k])]));
    try { const r = await api('/api/admin/configuracion-financiera-inicial', { method: 'PUT', body: valores }); setCfg(r.config); onAviso({ tipo: 'ok', texto: 'Parámetros guardados: aplican a servicios nuevos' }); }
    catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
  };

  if (!modelos || !cfg) return <Vacio>Cargando…</Vacio>;
  const sumaServicio = ['OPERACION_SB', 'OPERACION_ASOCIADO', 'ESPECIALISTA', 'ASPIRANTES', 'APERTURADOR'].reduce((s, k) => s + (Number(cfg[k]) || 0), 0);
  return (
    <div className="space-y-4">
      <Tarjeta titulo="Modelos de negocio">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p><strong>Inicial</strong> (especialistas y aspirantes): <span className="text-green-700 font-medium">activo</span></p>
            <p><strong>Permanente</strong> (contratistas y técnicos): {modelos.permanenteActivo ? <span className="text-green-700 font-medium">activo</span> : <span className="text-gray-500 font-medium">apagado</span>}</p>
          </div>
          <Boton variante={modelos.permanenteActivo ? 'peligro' : 'primario'} onClick={alternarPermanente}>{modelos.permanenteActivo ? 'Apagar permanente' : 'Activar permanente'}</Boton>
        </div>
      </Tarjeta>
      <Tarjeta titulo={`Parámetros del modelo inicial · ${version}`}>
        <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
          {PARAMETROS.map(([k, label, unidad]) => (
            <Campo key={k} label={`${label} (${unidad})`}>
              <input type="number" min="0" step="0.01" className={claseInput} value={cfg[k]} onChange={e => setCfg({ ...cfg, [k]: e.target.value })} />
            </Campo>
          ))}
          <p className={`sm:col-span-2 text-sm ${sumaServicio > 100 ? 'text-red-600' : 'text-gray-600'}`}>
            Por servicio se reparte {sumaServicio}% de la mano de obra; el {Math.max(0, 100 - sumaServicio)}% restante es el remanente (se reparte en el cierre mensual).
          </p>
          <Boton type="submit" className="sm:col-span-2" disabled={sumaServicio > 100}>Guardar parámetros</Boton>
        </form>
      </Tarjeta>
    </div>
  );
}

async function ascender(rol, perfil, recargar, onAviso) {
  if (!window.confirm(`¿${nombreDe(perfil)} aprobó el examen? Se le dará el rol de contratista con la misma cuenta y su perfil de ${rol} quedará inactivo.`)) return;
  try {
    const r = await api('/api/admin/ascensos', { method: 'POST', body: { rol, perfilId: perfil._id } });
    onAviso({ tipo: 'ok', texto: `${r.message}.${r.aspirantesPorReasignar ? ` Tiene ${r.aspirantesPorReasignar} aspirante(s) activos por reasignar.` : ''}` });
    recargar();
  } catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
}

function Aspirantes({ onAviso }) {
  const [lista, setLista] = useState(null);
  const [especialistas, setEspecialistas] = useState([]);
  const cargar = useCallback(() => Promise.all([api('/api/inicial/aspirantes'), api('/api/inicial/especialistas?activo=true')])
    .then(([a, e]) => { setLista(a); setEspecialistas(e); })
    .catch(err => onAviso({ tipo: 'error', texto: err.message })), [onAviso]);
  useEffect(() => { cargar(); }, [cargar]);

  const reasignar = async (a, especialista) => {
    try { await api(`/api/inicial/aspirantes/${a._id}`, { method: 'PUT', body: { especialista } }); onAviso({ tipo: 'ok', texto: 'Aspirante reasignado' }); cargar(); }
    catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
  };

  if (!lista) return <Vacio>Cargando…</Vacio>;
  return (
    <Tarjeta titulo={`Aspirantes (${lista.filter(a => a.activo).length} activos)`}>
      {!lista.length ? <Vacio>Aún no hay aspirantes. Los dan de alta sus especialistas.</Vacio> : (
        <ul className="divide-y divide-gray-100">
          {lista.map(a => (
            <li key={a._id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-medium ${a.activo ? 'text-gray-900' : 'text-gray-400'}`}>{nombreDe(a)} {a.ascenso?.contratista && <span className="text-xs text-green-700">· ascendió</span>}</p>
                <p className="text-xs text-gray-500">{a.user?.email} · {(a.especialidades || []).map(s => s.nombre).join(', ') || 'sin especialidades'}</p>
              </div>
              {!a.ascenso?.contratista && (
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label="Especialista" className="text-sm border border-gray-300 rounded-lg px-2 py-1.5" value={a.especialista?._id || ''} onChange={e => reasignar(a, e.target.value)}>
                    {!especialistas.some(e => e._id === a.especialista?._id) && <option value={a.especialista?._id || ''}>{nombreDe(a.especialista)} (inactivo)</option>}
                    {especialistas.map(e => <option key={e._id} value={e._id}>{nombreDe(e)}</option>)}
                  </select>
                  {a.activo && <Boton variante="secundario" onClick={() => ascender('aspirante', a, cargar, onAviso)}>Dar rol de contratista</Boton>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

function Servicios() {
  const [estado, setEstado] = useState('');
  const [lista, setLista] = useState(null);
  useEffect(() => { api(`/api/inicial/citas${estado ? `?estado=${estado}` : ''}`).then(setLista).catch(() => setLista([])); }, [estado]);
  return (
    <Tarjeta titulo="Servicios del modelo inicial" accion={
      <select aria-label="Filtrar por estado" className="text-sm border border-gray-300 rounded-lg px-2 py-1" value={estado} onChange={e => setEstado(e.target.value)}>
        <option value="">Todos</option><option value="atendida">Por cotizar</option><option value="cotizada">Cotizados</option>
        <option value="aceptada">Aceptados</option><option value="en_progreso">En progreso</option><option value="completada">Terminados</option><option value="cancelada">Cancelados</option>
      </select>
    }>
      {lista === null ? <Vacio>Cargando…</Vacio> : !lista.length ? <Vacio>Sin servicios.</Vacio> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 pr-3">Servicio</th><th className="pr-3">Cliente</th><th className="pr-3">Especialista</th><th className="pr-3">Aspirantes</th><th className="pr-3 text-right">Total</th><th className="pr-3">Visita</th><th className="pr-3">Inicio</th><th>Estado</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(c => (
                <tr key={c._id}>
                  <td className="py-2 pr-3">{c.servicio?.nombre}</td>
                  <td className="pr-3">{c.cliente?.nombre}</td>
                  <td className="pr-3">{nombreDe(c.especialista)}</td>
                  <td className="pr-3">{(c.aspirantes || []).map(nombreDe).join(', ') || '—'}</td>
                  <td className="pr-3 text-right tabular-nums">{c.cotizacionAceptada ? peso(c.cotizacionAceptada.total) : '—'}</td>
                  <td className="pr-3">{fecha(c.fechaVisita)}</td>
                  <td className="pr-3">{fecha(c.fechaProgramada)}</td>
                  <td><EstadoCita cita={c} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );
}

function Sueldos({ onAviso }) {
  const [mes, setMes] = useState(mesActual());
  const [semana, setSemana] = useState(lunesDeHoy());
  const [lista, setLista] = useState(null);
  const cargar = useCallback(() => api(`/api/inicial/sueldos?mes=${mes}`).then(setLista).catch(() => setLista([])), [mes]);
  useEffect(() => { cargar(); }, [cargar]);

  const generar = async () => {
    try { const r = await api('/api/inicial/sueldos', { method: 'POST', body: { semana } }); onAviso({ tipo: 'ok', texto: `Semana ${r.semana}: ${r.creados} sueldo(s) nuevos, ${r.yaExistian} ya existían` }); setMes(semana.slice(0, 7)); cargar(); }
    catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
  };
  const marcar = async (p, estado) => {
    const referencia = estado === 'pagado' ? window.prompt('Referencia o folio de la transferencia (opcional):', p.referencia || '') : undefined;
    if (referencia === null) return;
    try { await api(`/api/inicial/sueldos/${p._id}`, { method: 'PATCH', body: { estado, ...(referencia ? { referencia } : {}) } }); cargar(); }
    catch (err) { onAviso({ tipo: 'error', texto: err.message }); }
  };

  const total = (lista || []).filter(p => p.estado !== 'cancelado').reduce((s, p) => s + p.monto, 0);
  const pagado = (lista || []).filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0);
  return (
    <div className="space-y-4">
      <Tarjeta titulo="Generar semana">
        <div className="flex flex-wrap items-end gap-3">
          <Campo label="Lunes de la semana"><input type="date" className={claseInput} value={semana} onChange={e => setSemana(e.target.value)} /></Campo>
          <Boton onClick={generar}>Generar sueldos de la semana</Boton>
        </div>
        <p className="text-xs text-gray-500 mt-2">Crea un sueldo pendiente por cada especialista activo y aprobado, con su sueldo vigente. No duplica.</p>
      </Tarjeta>
      <div className="flex items-center gap-2">
        <label htmlFor="mes-sueldos" className="text-sm text-gray-600">Mes</label>
        <input id="mes-sueldos" type="month" className="border border-gray-300 rounded-lg px-2 py-1 text-sm" value={mes} onChange={e => setMes(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><Cifra label="Sueldos del mes" valor={peso(total)} /><Cifra label="Pagado" valor={peso(pagado)} nota={`Pendiente: ${peso(total - pagado)}`} /></div>
      <Tarjeta titulo="Sueldos">
        {lista === null ? <Vacio>Cargando…</Vacio> : !lista.length ? <Vacio>Sin sueldos generados en este mes.</Vacio> : (
          <ul className="divide-y divide-gray-100 text-sm">
            {lista.map(p => (
              <li key={p._id} className="py-2 flex flex-wrap items-center justify-between gap-3">
                <span>{nombreDe(p.especialista)} · semana del {p.semana}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{peso(p.monto)}</span>
                  <span className={p.estado === 'pagado' ? 'text-green-700' : p.estado === 'cancelado' ? 'text-gray-400' : 'text-orange-600'}>{p.estado}</span>
                  {p.estado === 'pendiente' && <Boton onClick={() => marcar(p, 'pagado')}>Marcar pagado</Boton>}
                  {p.estado === 'pagado' && <Boton variante="secundario" onClick={() => marcar(p, 'pendiente')}>Deshacer</Boton>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

function Cierre() {
  const [mes, setMes] = useState(mesActual());
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setC(null); api(`/api/inicial/cierre?mes=${mes}`).then(d => { setC(d); setError(''); }).catch(e => setError(e.message)); }, [mes]);
  const Fila = ({ label, valor, fuerte, negativo }) => (
    <div className={`flex justify-between py-1.5 ${fuerte ? 'font-semibold border-t mt-1 pt-2' : ''}`}><span>{label}</span><span className={`tabular-nums ${negativo ? 'text-red-600' : ''}`}>{negativo ? '−' : ''}{peso(valor)}</span></div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="mes-cierre" className="text-sm text-gray-600">Mes</label>
        <input id="mes-cierre" type="month" className="border border-gray-300 rounded-lg px-2 py-1 text-sm" value={mes} onChange={e => setMes(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!c ? <Vacio>Cargando…</Vacio> : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Cifra label="Mano de obra del mes" valor={peso(c.ventaMO)} nota={`${c.servicios} servicio(s) cerrados`} />
            <Cifra label="Resultado" valor={peso(c.resultado)} nota={c.resultado < 0 ? 'Negativo: no hay reparto' : 'Se reparte 50/50'} />
            <Cifra label="Sin Batallar" valor={peso(c.sinBatallar)} nota={`Asociado(s): ${peso(c.asociado)}`} />
          </div>
          <Tarjeta titulo="Desglose">
            <div className="text-sm max-w-lg">
              <Fila label="Mano de obra" valor={c.ventaMO} />
              <Fila label="Especialistas (comisión)" valor={c.especialistas} negativo />
              <Fila label="Aspirantes" valor={c.aspirantes} negativo />
              <Fila label="Aperturadores (mayor entre 3% y garantía)" valor={c.aperturadores} negativo />
              <Fila label="Costos de operación (SB + asociado)" valor={c.costosOperacion} negativo />
              <Fila label={`Sueldos base (${c.sueldos.semanasRegistradas} registrados)`} valor={c.sueldosBase} negativo />
              <Fila label="Resultado" valor={c.resultado} fuerte />
            </div>
            <p className="text-xs text-gray-500 mt-3">Sueldos proyectados con 52/12 semanas: {peso(c.sueldos.proyectados)}. {c.sueldos.pendientesDePago ? `${c.sueldos.pendientesDePago} semana(s) sin pagar.` : ''}</p>
          </Tarjeta>
          <Tarjeta titulo="Aperturadores">
            {!c.pagosAperturadores.length ? <Vacio>Sin aperturadores activos.</Vacio> : (
              <ul className="divide-y divide-gray-100 text-sm">
                {c.pagosAperturadores.map(a => (
                  <li key={a.id} className="py-2 flex justify-between gap-3"><span>{a.nombre || a.id}</span>
                    <span className="tabular-nums">3%: {peso(a.comision)} · paga {peso(a.pago)}{a.complementoGarantia > 0 ? ' (garantía)' : ''}</span></li>
                ))}
              </ul>
            )}
          </Tarjeta>
          {c.porAsociado.length > 0 && (
            <Tarjeta titulo="Parte de cada asociado">
              <ul className="divide-y divide-gray-100 text-sm">
                {c.porAsociado.map(a => <li key={a.id} className="py-2 flex justify-between"><span>{a.nombre || a.id}</span><span className="tabular-nums">{peso(a.monto)} (MO {peso(a.manoDeObra)})</span></li>)}
              </ul>
            </Tarjeta>
          )}
        </>
      )}
    </div>
  );
}

export default function ModeloInicialAdmin({ asociados = [] }) {
  const [pestana, setPestana] = useState('resumen');
  const [aviso, setAviso] = useState(null);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Modelo inicial</h2>
        <p className="text-sm text-gray-600">Especialistas que atienden y forman aspirantes. Versión financiera SB-FIN-INI-2026-11-09.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto bg-white rounded-lg border border-gray-200 p-2" role="tablist">
        {PESTANAS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => { setPestana(k); setAviso(null); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${pestana === k ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
        ))}
      </div>
      <Aviso aviso={aviso} onCerrar={() => setAviso(null)} />
      {pestana === 'resumen' && <Configuracion onAviso={setAviso} />}
      {pestana === 'especialistas' && (
        <EspecialistasAsociado esAdmin asociados={asociados}
          acciones={(e, recargar, avisar) => e.activo && <Boton variante="secundario" onClick={() => ascender('especialista', e, recargar, avisar)}>Dar rol de contratista</Boton>} />
      )}
      {pestana === 'aspirantes' && <Aspirantes onAviso={setAviso} />}
      {pestana === 'servicios' && <Servicios />}
      {pestana === 'sueldos' && <Sueldos onAviso={setAviso} />}
      {pestana === 'cierre' && <Cierre />}
    </div>
  );
}
