'use client';
// Zonas de cobertura de un contratista: varias, máximo 5. Solo las asigna el incorporador/admin.
import { useEffect, useState } from 'react';
import { ChipsSeleccion } from './ChipsServicios';

export const MAX_ZONAS = 5;

export default function SelectorZonas({ seleccion, onChange }) {
  const [zonas, setZonas] = useState([]);

  useEffect(() => {
    fetch('/api/areas?activo=true')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setZonas((Array.isArray(d) ? d : []).map(a => ({ key: a._id, label: a.nombre }))))
      .catch(() => setZonas([]));
  }, []);

  // Al llegar al máximo solo se pueden quitar zonas
  const cambiar = (keys) => onChange(keys.length > MAX_ZONAS ? seleccion : keys);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Zonas de cobertura ({seleccion.length}/{MAX_ZONAS}). El contratista solo podrá verlas.</p>
      <ChipsSeleccion opciones={zonas} seleccion={seleccion} onChange={cambiar} vacio="No hay zonas activas disponibles." />
      {seleccion.length >= MAX_ZONAS && <p className="text-xs text-amber-600 mt-1">Llegaste al máximo de {MAX_ZONAS} zonas.</p>}
    </div>
  );
}
