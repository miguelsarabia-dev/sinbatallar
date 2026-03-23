// components/view/contratista/CrearCotizacion.jsx
'use client';

import { useState } from 'react';
import { FaDollarSign, FaPlus, FaTrash, FaSave, FaTimes, FaMapMarkerAlt } from 'react-icons/fa';

export default function CrearCotizacion({ cita, onSave, onCancel, isLoading = false }) {
  const [cotizacion, setCotizacion] = useState({
    descripcionTrabajo: '',
    manoDeObra: '',
    horasEstimadas: '',
    metodoPago: 'efectivo',
    garantia: '',
    observaciones: '',
    materiales: []
  });

  const [errores, setErrores] = useState({});

  const agregarMaterial = () => {
    setCotizacion(prev => ({
      ...prev,
      materiales: [...prev.materiales, {
        nombre: '',
        descripcion: '',
        cantidad: 1,
        precioPorUnidad: 0,
        total: 0
      }]
    }));
  };

  const actualizarMaterial = (index, campo, valor) => {
    setCotizacion(prev => {
      const nuevosMateriales = [...prev.materiales];
      const material = { ...nuevosMateriales[index] };
      
      if (campo === 'cantidad' || campo === 'precioPorUnidad') {
        // Convertir a número y validar que no sea NaN
        const numeroValor = parseFloat(valor) || 0;
        material[campo] = numeroValor;
        material.total = material.cantidad * material.precioPorUnidad;
      } else {
        material[campo] = valor;
      }
      
      nuevosMateriales[index] = material;
      return { ...prev, materiales: nuevosMateriales };
    });
  };

  const eliminarMaterial = (index) => {
    setCotizacion(prev => ({
      ...prev,
      materiales: prev.materiales.filter((_, i) => i !== index)
    }));
  };

  const calcularPrecioTotal = () => {
    const manoDeObra = parseFloat(cotizacion.manoDeObra) || 0;
    const precioMateriales = cotizacion.materiales.reduce((total, material) => total + material.total, 0);
    const subtotal = manoDeObra + precioMateriales;
    
    // IVA obligatorio sobre TODA la facturación (mano de obra + materiales)
    const iva = Math.round((subtotal * 16) / 100);
    
    return subtotal + iva;
  };

  const calcularSubtotal = () => {
    const manoDeObra = parseFloat(cotizacion.manoDeObra) || 0;
    const precioMateriales = cotizacion.materiales.reduce((total, material) => total + material.total, 0);
    return manoDeObra + precioMateriales;
  };

  const calcularIVA = () => {
    const subtotal = calcularSubtotal();
    return Math.round((subtotal * 16) / 100);
  };

  const validarFormulario = () => {
    const nuevosErrores = {};
    
    if (!cotizacion.descripcionTrabajo.trim()) {
      nuevosErrores.descripcionTrabajo = 'La descripción del trabajo es requerida';
    }
    
    if (!cotizacion.manoDeObra || parseFloat(cotizacion.manoDeObra) <= 0) {
      nuevosErrores.manoDeObra = 'El precio de mano de obra debe ser mayor a 0';
    }
    
    if (!cotizacion.horasEstimadas || parseFloat(cotizacion.horasEstimadas) <= 0) {
      nuevosErrores.horasEstimadas = 'Las horas estimadas deben ser mayor a 0';
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    const cotizacionData = {
      ...cotizacion,
      cita: cita._id,
      cliente: cita.cliente._id || cita.cliente,
      contratista: cita.contratista._id || cita.contratista,
      servicio: cita.servicio._id || cita.servicio,
      precio: calcularPrecioTotal(),
      ubicacion: cita.ubicacion,
      descripcionProblema: cita.descripcionProblema,
      detallesServicio: cita.detallesServicio,
      esExpress: cita.esExpress,
      estado: 'enviada',
      fechaEnvio: new Date(),
      fechaExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
    };
    
    if (onSave) {
      await onSave(cotizacionData);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaDollarSign className="text-white text-xl" />
            <div>
              <h3 className="font-semibold text-white text-lg">Crear Cotización</h3>
              <p className="text-blue-100 text-sm">
                Servicio: {cita.servicio?.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-blue-100 hover:text-white transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>
      </div>

      {/* Información de la solicitud */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <h4 className="font-medium text-gray-900 mb-2">Problema reportado:</h4>
        <p className="text-gray-700 text-sm">{cita.descripcionProblema}</p>
        {cita.ubicacion?.direccion && (
          <p className="text-gray-600 text-xs mt-1 flex items-center gap-1">
            <FaMapMarkerAlt className="text-gray-400" size={10} />
            {cita.ubicacion.direccion}
          </p>
        )}
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Descripción del trabajo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción del trabajo a realizar *
          </label>
          <textarea
            value={cotizacion.descripcionTrabajo || ''}
            onChange={(e) => setCotizacion(prev => ({ ...prev, descripcionTrabajo: e.target.value }))}
            placeholder="Describe detalladamente el trabajo que realizarás..."
            className={`w-full p-3 border rounded-md resize-none ${
              errores.descripcionTrabajo ? 'border-red-300' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            rows={4}
          />
          {errores.descripcionTrabajo && (
            <p className="text-red-500 text-xs mt-1">{errores.descripcionTrabajo}</p>
          )}
        </div>

        {/* Precio y tiempo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mano de obra *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                value={cotizacion.manoDeObra || ''}
                onChange={(e) => setCotizacion(prev => ({ ...prev, manoDeObra: e.target.value }))}
                className={`w-full pl-8 pr-3 py-2 border rounded-md ${
                  errores.manoDeObra ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            {errores.manoDeObra && (
              <p className="text-red-500 text-xs mt-1">{errores.manoDeObra}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horas estimadas de trabajo *
            </label>
            <div className="relative">
              <input
                type="number"
                value={cotizacion.horasEstimadas || ''}
                onChange={(e) => setCotizacion(prev => ({ ...prev, horasEstimadas: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md ${
                  errores.horasEstimadas ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="ej: 2.5"
                min="0"
                step="0.5"
              />
              <span className="absolute right-3 top-3 text-gray-500 text-sm">horas</span>
            </div>
            {errores.horasEstimadas && (
              <p className="text-red-500 text-xs mt-1">{errores.horasEstimadas}</p>
            )}
          </div>
        </div>

        {/* Materiales */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Materiales necesarios
            </label>
            <button
              type="button"
              onClick={agregarMaterial}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors"
            >
              <FaPlus size={12} />
              Agregar
            </button>
          </div>

          {cotizacion.materiales.length > 0 ? (
            <div className="space-y-4 bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 mb-2">
                <div className="col-span-4">Material</div>
                <div className="col-span-3">Descripción</div>
                <div className="col-span-1 text-center">Cant.</div>
                <div className="col-span-2 text-center">Precio/Unidad</div>
                <div className="col-span-1 text-center">Total</div>
                <div className="col-span-1"></div>
              </div>
              {cotizacion.materiales.map((material, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Nombre del material"
                      value={material.nombre || ''}
                      onChange={(e) => actualizarMaterial(index, 'nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Descripción/Especificaciones"
                      value={material.descripcion || ''}
                      onChange={(e) => actualizarMaterial(index, 'descripcion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      placeholder="1"
                      value={material.cantidad || ''}
                      onChange={(e) => actualizarMaterial(index, 'cantidad', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      step="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={material.precioPorUnidad || ''}
                        onChange={(e) => actualizarMaterial(index, 'precioPorUnidad', e.target.value)}
                        className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="px-3 py-2 bg-gray-200 border rounded-md text-sm text-center font-medium">
                      ${(material.total || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => eliminarMaterial(index)}
                      className="text-red-500 hover:text-red-700 p-2 transition-colors"
                      title="Eliminar material"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-md text-center">
              No se requieren materiales adicionales
            </p>
          )}
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de pago
            </label>
            <select
              value={cotizacion.metodoPago}
              onChange={(e) => setCotizacion(prev => ({ ...prev, metodoPago: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Garantía
            </label>
            <input
              type="text"
              value={cotizacion.garantia || ''}
              onChange={(e) => setCotizacion(prev => ({ ...prev, garantia: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ej: 6 meses, 1 año"
            />
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones adicionales
          </label>
          <textarea
            value={cotizacion.observaciones || ''}
            onChange={(e) => setCotizacion(prev => ({ ...prev, observaciones: e.target.value }))}
            placeholder="Notas adicionales, recomendaciones, etc..."
            className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>



        {/* Desglose de precios */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-lg font-medium text-blue-900 mb-3">Resumen de Costos</h4>
          <div className="space-y-2 text-blue-800">
            <div className="flex justify-between">
              <span>Mano de obra:</span>
              <span className="font-medium">${(parseFloat(cotizacion.manoDeObra) || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Materiales:</span>
              <span className="font-medium">${(cotizacion.materiales.reduce((total, material) => total + material.total, 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-blue-200 pt-2">
              <span>Subtotal:</span>
              <span className="font-medium">${calcularSubtotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA 16% (sobre subtotal):</span>
              <span className="font-medium">${calcularIVA().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-blue-200 pt-2">
              <span>Total:</span>
              <span>${calcularPrecioTotal().toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaSave />
            {isLoading ? 'Enviando...' : 'Enviar Cotización'}
          </button>
        </div>
      </form>
    </div>
  );
}
