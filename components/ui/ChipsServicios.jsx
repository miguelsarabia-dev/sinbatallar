'use client';
// Chips de selección múltiple. Con `opciones` usa esa lista ({ key, label }); sin ella carga el catálogo de
// servicios activos (GET /api/servicios) y la selección son ids de servicio.
import { useEffect, useState } from 'react';

export function ChipsSeleccion({ opciones, seleccion, onChange, vacio = 'No hay opciones disponibles.' }) {
  const alternar = (key) => onChange(seleccion.includes(key) ? seleccion.filter(k => k !== key) : [...seleccion, key]);
  if (!opciones.length) return <p className="text-sm italic text-gray-500">{vacio}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map(o => {
        const sel = seleccion.includes(o.key);
        return (
          <button
            type="button"
            key={o.key}
            onClick={() => alternar(o.key)}
            aria-pressed={sel}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${sel ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-primary'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ChipsServicios({ seleccion, onChange }) {
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/servicios')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setCatalogo((Array.isArray(d) ? d : []).filter(s => s.activo !== false).map(s => ({ key: s._id, label: s.nombre }))))
      .catch(() => setCatalogo([]))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="text-sm text-gray-500">Cargando servicios...</p>;
  return <ChipsSeleccion opciones={catalogo} seleccion={seleccion} onChange={onChange} vacio="No hay servicios en el catálogo." />;
}
