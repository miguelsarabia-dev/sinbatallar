'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaStore, FaCheck, FaTimes, FaTrash, FaToggleOn, FaToggleOff, FaSync, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import MapLocationSelector from '@/components/maps/MapLocationSelector';

// Devuelve { lat, lng } desde el GeoJSON Point del ferretero, o null
function coordsDeFerretero(f) {
  const c = f?.ubicacion?.coordinates;
  return Array.isArray(c) && c.length === 2 ? { lat: c[1], lng: c[0] } : null;
}

export default function FerretersManager({ showError, showSuccess, showConfirm }) {
  const [ferreteros, setFerreteros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendientes'); // pendientes | activos | todos
  const [ubicacionModal, setUbicacionModal] = useState(null); // ferretero seleccionado para ver ubicación

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ferreteros');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFerreteros(data);
    } catch {
      showError?.('Error al cargar ferreteros');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { cargar(); }, [cargar]);

  const aprobar = async (ferretero) => {
    try {
      const res = await fetch(`/api/ferreteros/${ferretero._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: true, catalogoActivo: true, pendienteAprobacion: false }),
      });
      if (!res.ok) throw new Error();
      setFerreteros(prev => prev.map(f => f._id === ferretero._id
        ? { ...f, activo: true, catalogoActivo: true, pendienteAprobacion: false }
        : f
      ));
      showSuccess?.(`${ferretero.nombreNegocio} aprobado`);
    } catch {
      showError?.('Error al aprobar ferretero');
    }
  };

  const toggleActivo = async (ferretero) => {
    try {
      const res = await fetch(`/api/ferreteros/${ferretero._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !ferretero.activo }),
      });
      if (!res.ok) throw new Error();
      setFerreteros(prev => prev.map(f => f._id === ferretero._id ? { ...f, activo: !f.activo } : f));
      showSuccess?.(ferretero.activo ? 'Ferretero desactivado' : 'Ferretero activado');
    } catch {
      showError?.('Error al cambiar estado');
    }
  };

  const eliminar = (ferretero) => {
    showConfirm?.(`¿Eliminar "${ferretero.nombreNegocio}"? Se eliminarán todos sus materiales.`, async () => {
      try {
        const res = await fetch(`/api/ferreteros/${ferretero._id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        setFerreteros(prev => prev.filter(f => f._id !== ferretero._id));
        showSuccess?.('Ferretero eliminado');
      } catch {
        showError?.('Error al eliminar ferretero');
      }
    });
  };

  // El admin puede corregir la ubicación de una ferretería desde el visor
  const guardarUbicacionAdmin = async (loc) => {
    const f = ubicacionModal;
    if (!f?._id || !loc) return;
    try {
      const res = await fetch(`/api/ferreteros/${f._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direccion: loc.addressData?.direccionCompleta || f.direccion || '',
          ubicacion: { lat: loc.lat, lng: loc.lng },
        }),
      });
      if (!res.ok) throw new Error();
      setFerreteros(prev => prev.map(x => x._id === f._id
        ? { ...x, direccion: loc.addressData?.direccionCompleta || x.direccion, ubicacion: { type: 'Point', coordinates: [loc.lng, loc.lat] } }
        : x
      ));
      showSuccess?.('Ubicación actualizada');
    } catch {
      showError?.('Error al actualizar la ubicación');
    }
  };

  const lista = ferreteros.filter(f => {
    if (filtro === 'pendientes') return f.pendienteAprobacion || !f.activo;
    if (filtro === 'activos') return f.activo && !f.pendienteAprobacion;
    return true;
  });

  const pendientesCount = ferreteros.filter(f => f.pendienteAprobacion || !f.activo).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ferreterías</h2>
          {pendientesCount > 0 && (
            <p className="text-sm text-amber-600 font-medium mt-0.5">
              {pendientesCount} solicitud{pendientesCount > 1 ? 'es' : ''} pendiente{pendientesCount > 1 ? 's' : ''} de aprobación
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {[['pendientes', 'Pendientes'], ['activos', 'Activos'], ['todos', 'Todos']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`px-3 py-1.5 ${filtro === key ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {label}
                {key === 'pendientes' && pendientesCount > 0 && (
                  <span className="ml-1 bg-amber-500 text-white rounded-full text-xs px-1.5">{pendientesCount}</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={cargar}
            className="p-2 text-gray-500 hover:text-primary border border-gray-300 rounded-lg"
            title="Actualizar"
          >
            <FaSync size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FaStore size={40} className="mx-auto mb-3 text-gray-300" />
          <p>No hay ferreterías {filtro === 'pendientes' ? 'pendientes' : filtro === 'activos' ? 'activas' : ''}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Negocio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Responsable</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ubicación</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Registro</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(f => (
                <tr key={f._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FaStore size={14} className="text-primary" />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{f.nombreNegocio}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm text-gray-600">
                    {f.user?.nombre || '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-500">
                    {f.user?.email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {f.pendienteAprobacion ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <FaClock size={10} />
                        Pendiente
                      </span>
                    ) : f.activo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <FaCheck size={10} />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <FaTimes size={10} />
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {coordsDeFerretero(f) ? (
                      <button
                        onClick={() => setUbicacionModal(f)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Ver ubicación en el mapa"
                      >
                        <FaMapMarkerAlt size={10} />
                        Ver mapa
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700" title="Sin ubicación: no aparece en búsquedas por cercanía">
                        <FaTimes size={10} />
                        Sin ubicación
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400">
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {f.pendienteAprobacion ? (
                        <button
                          onClick={() => aprobar(f)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                          <FaCheck size={11} />
                          Aprobar
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleActivo(f)}
                          className={`p-1.5 rounded-lg transition-colors ${f.activo ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                          title={f.activo ? 'Desactivar' : 'Activar'}
                        >
                          {f.activo ? <FaToggleOn size={20} /> : <FaToggleOff size={20} />}
                        </button>
                      )}
                      <button
                        onClick={() => eliminar(f)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Visor / editor de ubicación de la ferretería */}
      <MapLocationSelector
        isOpen={!!ubicacionModal}
        onClose={() => setUbicacionModal(null)}
        onLocationSelect={guardarUbicacionAdmin}
        initialLocation={ubicacionModal ? coordsDeFerretero(ubicacionModal) : null}
        title={ubicacionModal ? `Ubicación de ${ubicacionModal.nombreNegocio}` : 'Ubicación'}
      />
    </div>
  );
}
