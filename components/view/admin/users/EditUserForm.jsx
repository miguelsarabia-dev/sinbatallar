"use client";
import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';

export default function EditUserForm({ 
  editingUser, 
  onClose, 
  onUpdate, 
  onConvertToAperturador, 
  onConvertToIncorporador,
  showError 
}) {
  const [formData, setFormData] = useState({
    _id: editingUser?._id || '',
    nombre: editingUser?.nombre || '',
    email: editingUser?.email || '',
    telefono: editingUser?.telefono || '',
    role: editingUser?.role || 'cliente'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.email || !formData.telefono) {
      showError('Nombre, email y teléfono son obligatorios');
      return;
    }
    onUpdate(formData);
  };

  const handleConvertToAperturador = () => {
    onConvertToAperturador(editingUser._id);
    onClose();
  };

  const handleConvertToIncorporador = () => {
    onConvertToIncorporador(editingUser._id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Editar Usuario</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              required
            >
              <option value="cliente">Cliente</option>
              <option value="admin">Admin</option>
              <option value="aperturador">Aperturador</option>
              <option value="incorporador">Incorporador</option>
            </select>
          </div>

          {/* Opciones de conversión rápida */}
          {formData.role === 'cliente' && onConvertToAperturador && onConvertToIncorporador && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-900 mb-2">Conversión Rápida:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleConvertToAperturador}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                >
                  Aperturador
                </button>
                <button
                  type="button"
                  onClick={handleConvertToIncorporador}
                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                >
                  Incorporador
                </button>
              </div>
            </div>
          )}
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
            >
              Actualizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
