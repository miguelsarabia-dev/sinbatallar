"use client";

import { useState } from 'react';
import { FaDollarSign, FaFileText, FaCreditCard, FaCheck, FaTimes } from 'react-icons/fa';

const CotizacionForm = ({ serviceId, onSuccess, onCancel, serviceData }) => {
  const [formData, setFormData] = useState({
    precio: '',
    descripcion: '',
    metodoPago: 'efectivo',
    horasEstimadas: '',
    garantia: '',
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const metodosPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
    { value: 'transferencia', label: 'Transferencia Bancaria' },
    { value: 'mixto', label: 'Mixto' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.precio || parseFloat(formData.precio) <= 0) {
      newErrors.precio = 'El precio es requerido y debe ser mayor a 0';
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción del trabajo es requerida';
    }

    if (!formData.horasEstimadas || parseFloat(formData.horasEstimadas) <= 0) {
      newErrors.horasEstimadas = 'Las horas estimadas son requeridas y deben ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const cotizacionData = {
        citaId: serviceId,
        precio: parseFloat(formData.precio),
        descripcion: formData.descripcion,
        metodoPago: formData.metodoPago,
        horasEstimadas: parseFloat(formData.horasEstimadas),
        garantia: formData.garantia,
        observaciones: formData.observaciones,
        estado: 'pendiente'
      };

      const response = await fetch('/api/cotizaciones/crear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cotizacionData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Actualizar el estado de la cita a "cotizacion_generada"
        await fetch(`/api/citas/${serviceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            estado: 'cotizacion_generada',
            comentario: 'Cotización generada por el técnico'
          }),
        });

        onSuccess(result);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar la cotización');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error al generar la cotización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FaDollarSign className="mr-2 text-green-600" />
              Generar Cotización
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Información del servicio */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Información del Servicio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <p className="text-blue-600">
                <strong>Cliente:</strong> {serviceData?.cliente?.nombre}
              </p>
              <p className="text-blue-600">
                <strong>Servicio:</strong> {serviceData?.servicio?.nombre}
              </p>
              {serviceData?.descripcionProblema && (
                <p className="text-blue-600 col-span-2">
                  <strong>Problema:</strong> {serviceData.descripcionProblema}
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Precio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio del Servicio (MXN) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  name="precio"
                  value={formData.precio}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.precio ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.precio && (
                <p className="text-red-500 text-sm mt-1">{errors.precio}</p>
              )}
            </div>

            {/* Descripción del trabajo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Trabajo *
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.descripcion ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe detalladamente el trabajo que se realizará..."
              />
              {errors.descripcion && (
                <p className="text-red-500 text-sm mt-1">{errors.descripcion}</p>
              )}
            </div>

            {/* Método de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago Preferido
              </label>
              <select
                name="metodoPago"
                value={formData.metodoPago}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {metodosPago.map(metodo => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tiempo estimado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horas Estimadas de Trabajo *
              </label>
              <input
                type="number"
                name="horasEstimadas"
                value={formData.horasEstimadas}
                onChange={handleInputChange}
                step="0.5"
                min="0.5"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.horasEstimadas ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: 2.5"
              />
              {errors.horasEstimadas && (
                <p className="text-red-500 text-sm mt-1">{errors.horasEstimadas}</p>
              )}
            </div>

            {/* Garantía */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Garantía Ofrecida
              </label>
              <input
                type="text"
                name="garantia"
                value={formData.garantia}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 6 meses, 1 año, etc."
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones Adicionales
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Información adicional, materiales necesarios, etc."
              />
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center space-x-2"
              >
                <FaCheck />
                <span>{loading ? 'Generando...' : 'Generar Cotización'}</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 flex items-center justify-center space-x-2"
              >
                <FaTimes />
                <span>Cancelar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CotizacionForm;
