"use client";
import { useState, useEffect } from 'react';
import { FaTimes, FaTools, FaMapMarkerAlt } from 'react-icons/fa';
import MapLocationSelector from '../../../maps/MapLocationSelector';

export default function EditContratistaForm({
  editingContratista,
  onClose,
  onUpdate,
  serviciosDisponibles,
  showError
}) {
  const [formData, setFormData] = useState({
    _id: editingContratista?._id || '',
    nombre: editingContratista?.nombre || '',
    direccion: editingContratista?.direccion || '',
    telefono: editingContratista?.telefono || '',
    email: editingContratista?.email || '',
    servicios: (editingContratista?.servicios || []).map(servicio =>
      typeof servicio === 'string' ? servicio : servicio._id
    ),
    ubicacion: {
      lat: editingContratista?.ubicacion?.lat || 0,
      lng: editingContratista?.ubicacion?.lng || 0,
      direccion: editingContratista?.ubicacion?.direccion || editingContratista?.direccion || ''
    }
  });

  const [showMapSelector, setShowMapSelector] = useState(false);

  // Actualizar servicios cuando cambie editingContratista
  useEffect(() => {
    if (editingContratista) {
      const serviciosIds = (editingContratista.servicios || []).map(servicio =>
        typeof servicio === 'string' ? servicio : servicio._id
      );

      setFormData(prev => ({
        ...prev,
        servicios: serviciosIds
      }));
    }
  }, [editingContratista]);

  const toggleServicio = (servicioId) => {
    setFormData(prev => ({
      ...prev,
      servicios: prev.servicios.includes(servicioId)
        ? prev.servicios.filter(id => id !== servicioId)
        : [...prev.servicios, servicioId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.direccion || !formData.telefono || !formData.email) {
      showError('Todos los campos son obligatorios');
      return;
    }
    onUpdate(formData);
  };

  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({
      ...prev,
      ubicacion: {
        lat: locationData.lat,
        lng: locationData.lng,
        direccion: locationData.direccionCompleta || prev.ubicacion.direccion
      },
      direccion: locationData.direccionCompleta || prev.direccion
    }));
    setShowMapSelector(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Editar Contratista</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calificación Promedio
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                <span className="text-gray-700 font-semibold">
                  {editingContratista?.promedioCalificacion?.toFixed(1) || '0.0'} ⭐
                </span>
                <span className="text-gray-500 text-sm ml-2">
                  ({editingContratista?.totalCalificaciones || 0} calificaciones)
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección *
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Servicios que puede ofrecer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Servicios que puede ofrecer
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
              {serviciosDisponibles && serviciosDisponibles.length > 0 ? serviciosDisponibles.map((servicio) => {
                const isSelected = formData.servicios.includes(servicio._id);
                return (
                  <div
                    key={servicio._id}
                    onClick={() => toggleServicio(servicio._id)}
                    className={`
                      cursor-pointer rounded-lg border-2 p-3 transition-all duration-200 
                      ${isSelected
                        ? 'border-primary bg-primary text-white shadow-md'
                        : 'border-gray-200 bg-white hover:border-primary hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {servicio.nombre}
                        </h4>
                        <p className={`text-xs mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                          {servicio.categoria}
                        </p>
                        {servicio.tipo && (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${isSelected
                              ? 'bg-white/20 text-white'
                              : servicio.tipo === 'urgente'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                            {servicio.tipo === 'urgente' ? 'Express' : 'Programable'}
                          </span>
                        )}
                      </div>
                      <div className={`ml-2 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                        {isSelected ? '✓' : '+'}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <FaTools className="mx-auto h-8 w-8 mb-2" />
                  <p>No hay servicios disponibles</p>
                  <p className="text-sm">Crea servicios primero en la pestaña "Servicios"</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Seleccionados: {formData.servicios.length} servicio(s)
            </p>
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación del Contratista
            </label>
            <div className="space-y-3">
              {/* Vista previa de ubicación */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FaMapMarkerAlt className="text-primary" />
                      <span className="text-sm font-medium text-gray-700">Ubicación actual:</span>
                    </div>
                    {formData.ubicacion.lat !== 0 && formData.ubicacion.lng !== 0 ? (
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="font-medium">{formData.direccion}</p>
                        <p className="text-xs text-gray-500">
                          Coordenadas: {formData.ubicacion.lat.toFixed(6)}, {formData.ubicacion.lng.toFixed(6)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No se ha seleccionado una ubicación</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón para abrir mapa */}
              <button
                type="button"
                onClick={() => setShowMapSelector(true)}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
              >
                <FaMapMarkerAlt size={16} />
                <span>{formData.ubicacion.lat !== 0 ? 'Cambiar ubicación en el mapa' : 'Seleccionar ubicación en el mapa'}</span>
              </button>
            </div>
          </div>

          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>

      {/* Modal del Selector de Mapa */}
      {showMapSelector && (
        <MapLocationSelector
          isOpen={showMapSelector}
          onClose={() => setShowMapSelector(false)}
          onLocationSelect={handleLocationSelect}
          initialLocation={formData.ubicacion.lat !== 0 ? formData.ubicacion : null}
          title="Selecciona la ubicación del contratista"
        />
      )}
    </div>
  );
}
