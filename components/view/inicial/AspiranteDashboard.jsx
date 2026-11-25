'use client';
// Panel del ASPIRANTE (modelo inicial): los servicios a los que lo lleva su especialista y lo que ha ganado.
// Solo consulta: las acciones del servicio las hace el especialista.
import { useCallback, useEffect, useState } from 'react';
import { FaUserGraduate, FaTools, FaWallet, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';
import { PanelInicial, Tarjeta, Vacio, Cifra, EstadoCita, SUBESTADO_LABEL, api, peso, fecha, direccionDe, nombreDe } from './comun';

const mesActual = () => new Date().toISOString().slice(0, 7);

function Servicios({ citas }) {
  const proximos = citas.filter(c => !['cancelada'].includes(c.estado) && !(c.estado === 'completada' && c.pagado));
  const pasados = citas.filter(c => !proximos.includes(c));
  const Lista = ({ items }) => (
    <ul className="space-y-3">
      {items.map(c => (
        <li key={c._id} className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{c.servicio?.nombre}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{c.descripcionProblema}</p>
            </div>
            <EstadoCita cita={c} />
          </div>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {c.fechaVisita && <p>Visita para cotizar: <strong>{fecha(c.fechaVisita)}{c.horaVisita ? ` a las ${c.horaVisita}` : ''}</strong></p>}
            {c.fechaProgramada && <p>Inicio del trabajo: <strong>{fecha(c.fechaProgramada)}{c.horaInicio ? ` a las ${c.horaInicio}` : ''}</strong></p>}
            <p className="flex items-start gap-2"><FaMapMarkerAlt className="mt-0.5 shrink-0" />{direccionDe(c.ubicacion) || '—'}</p>
            <p className="flex items-center gap-2"><FaPhoneAlt />Especialista: {nombreDe(c.especialista)} · {c.especialista?.user?.telefono || ''}</p>
            {c.subestadoTecnico && <p>Avance: {SUBESTADO_LABEL[c.subestadoTecnico]}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="space-y-4">
      <Tarjeta titulo="Próximos y en curso">{proximos.length ? <Lista items={proximos} /> : <Vacio>Tu especialista aún no te asigna servicios.</Vacio>}</Tarjeta>
      {pasados.length > 0 && <Tarjeta titulo="Anteriores"><Lista items={pasados} /></Tarjeta>}
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
        <label htmlFor="mes-aspirante" className="text-sm text-gray-600">Mes</label>
        <input id="mes-aspirante" type="month" className="border border-gray-300 rounded-lg px-2 py-1 text-sm" value={mes} onChange={e => setMes(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Cifra label="Ganado en el mes" valor={peso(datos?.total)} />
        <Cifra label="Servicios cerrados" valor={datos?.servicios?.length || 0} nota="Tu parte: 12% entre los aspirantes que fueron" />
      </div>
      <Tarjeta titulo="Por servicio">
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

export default function AspiranteDashboard() {
  const [seccion, setSeccion] = useState('servicios');
  const [citas, setCitas] = useState([]);
  const [perfil, setPerfil] = useState(null);

  const cargar = useCallback(async () => {
    const [c, p] = await Promise.allSettled([api('/api/inicial/citas'), api('/api/inicial/aspirantes')]);
    if (c.status === 'fulfilled') setCitas(c.value);
    if (p.status === 'fulfilled') setPerfil(p.value[0] || null);
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar]);

  const secciones = [
    { id: 'servicios', label: 'Mis servicios', icono: FaTools },
    { id: 'ganancias', label: 'Mis ganancias', icono: FaWallet }
  ];

  return (
    <PanelInicial titulo="Aspirante" subtitulo={perfil ? `Con ${nombreDe(perfil.especialista)}` : ''} icono={FaUserGraduate}
      secciones={secciones} activa={seccion} onCambiar={setSeccion}>
      {seccion === 'servicios' && <Servicios citas={citas} />}
      {seccion === 'ganancias' && <Ganancias />}
    </PanelInicial>
  );
}
