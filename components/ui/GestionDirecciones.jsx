"use client";

import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaHome, FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import DireccionFormConMapa from '../forms/DireccionFormConMapa';
import { useModal } from '../../hooks/useModal';
import Modal from './Modal';

const GestionDirecciones = ({ userId }) => {
  const [direcciones, setDirecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDireccion, setEditingDireccion] = useState(null);
  const { modalState, showError, showSuccess, showConfirm, hideModal } = useModal();

  useEffect(() => {
    cargarDirecciones();
  }, [userId]);

  const cargarDirecciones = async () => {
    try {
      const response = await fetch(`/api/users/direcciones?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        // El API devuelve { success: true, direcciones: [...] }
        const direccionesArray = data.direcciones || [];

        // Formatear direcciones
        const direccionesFormateadas = direccionesArray.map((dir, index) => ({
          ...dir,
          id: dir._id || `dir-${index}`,
          esPrincipal: index === 0
        }));

        setDirecciones(direccionesFormateadas);
      }
    } catch (error) {
      console.error('Error cargando direcciones:', error);
      showError('Error al cargar las direcciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDireccion = async (direccionData) => {
    try {
      const endpoint = editingDireccion ? '/api/users/direcciones' : '/api/users/direcciones';
      const method = editingDireccion ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          direccion: direccionData,
          ...(editingDireccion && { direccionId: editingDireccion.id })
        }),
      });

      if (response.ok) {
        showSuccess(
          editingDireccion ? 'Dirección actualizada exitosamente' : 'Dirección agregada exitosamente'
        );
        setShowForm(false);
        setEditingDireccion(null);
        cargarDirecciones();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al guardar la dirección');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error al guardar la dirección');
    }
  };

  const handleEditDireccion = (direccion) => {
    setEditingDireccion(direccion);
    setShowForm(true);
  };

  const handleDeleteDireccion = async (direccionId) => {
    const confirmed = await showConfirm(
      '¿Eliminar dirección?',
      'Esta acción no se puede deshacer.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/users/direcciones', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          direccionId
        }),
      });

      if (response.ok) {
        showSuccess('Dirección eliminada exitosamente');
        cargarDirecciones();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al eliminar la dirección');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error al eliminar la dirección');
    }
  };

  const handleSetPrincipal = async (direccionId) => {
    try {
      const response = await fetch('/api/users/direcciones/principal', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          direccionId
        }),
      });

      if (response.ok) {
        showSuccess('Dirección principal actualizada');
        cargarDirecciones();
      } else {
        const error = await response.json();
        showError(error.error || 'Error al actualizar dirección principal');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error al actualizar dirección principal');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Mis Direcciones
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FaPlus className="mr-2" />
          Agregar Dirección
        </button>
      </div>

      {direcciones.length === 0 ? (
        <div className="text-center py-8">
          <FaMapMarkerAlt className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay direcciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            Agrega tu primera dirección para facilitar la solicitud de servicios.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Agregar Dirección
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {direcciones.map((direccion) => (
            <div
              key={direccion.id}
              className={`border rounded-lg p-4 ${direccion.esPrincipal ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <FaHome className={`mr-2 ${direccion.esPrincipal ? 'text-blue-600' : 'text-gray-500'}`} />
                  <h4 className="font-medium text-gray-900">
                    {direccion.alias || 'Dirección'}
                  </h4>
                  {direccion.esPrincipal && (
                    <FaStar className="ml-2 text-yellow-500" title="Dirección principal" />
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditDireccion(direccion)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  {!direccion.esPrincipal && (
                    <button
                      onClick={() => handleDeleteDireccion(direccion.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium">{direccion.direccionCompleta}</p>
                {direccion.referencia && (
                  <p className="text-gray-600">
                    <strong>Referencia:</strong> {direccion.referencia}
                  </p>
                )}
              </div>

              {!direccion.esPrincipal && (
                <div className="mt-3">
                  <button
                    onClick={() => handleSetPrincipal(direccion.id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Marcar como principal
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal para formulario de dirección */}
      {showForm && (
        <DireccionFormConMapa
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingDireccion(null);
          }}
          title={editingDireccion ? "Editar Dirección" : "Nueva Dirección"}
          initialData={editingDireccion || {}}
          onSave={handleSaveDireccion}
        />
      )}

      <Modal {...modalState} onClose={hideModal} />
    </div>
  );
};

export default GestionDirecciones;
