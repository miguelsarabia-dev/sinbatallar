import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaTimes, FaCheck, FaPlus, FaTrash, FaWrench, FaBox } from 'react-icons/fa';

const CotizacionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading, 
  title = "Crear Cotización",
  citaInfo = {}
}) => {
  const [formData, setFormData] = useState({
    manoDeObra: '',
    descripcion: '',
    horasEstimadas: '',
    metodoPago: 'efectivo',
    garantia: '',
    observaciones: ''
  });
  
  const [materiales, setMateriales] = useState([
    { nombre: '', cantidad: '', precio: '', total: 0 }
  ]);
  
  const [errors, setErrors] = useState({});
  const [totales, setTotales] = useState({
    materiales: 0,
    manoDeObra: 0,
    total: 0
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        manoDeObra: '',
        descripcion: '',
        horasEstimadas: '',
        metodoPago: 'efectivo',
        garantia: '',
        observaciones: ''
      });
      setMateriales([{ nombre: '', cantidad: '', precio: '', total: 0 }]);
      setErrors({});
    }
  }, [isOpen]);

  // Calcular totales automáticamente
  useEffect(() => {
    const totalMateriales = materiales.reduce((sum, material) => sum + (material.total || 0), 0);
    const manoDeObra = parseFloat(formData.manoDeObra) || 0;
    const total = totalMateriales + manoDeObra;
    
    setTotales({
      materiales: totalMateriales,
      manoDeObra,
      total
    });
  }, [materiales, formData.manoDeObra]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.manoDeObra || parseFloat(formData.manoDeObra) < 0) {
      newErrors.manoDeObra = 'La mano de obra debe ser mayor o igual a 0';
    }
    
    if (!formData.descripcion || formData.descripcion.trim().length < 10) {
      newErrors.descripcion = 'La descripción debe tener al menos 10 caracteres';
    }
    
    // Solo validar tiempo estimado si no es un servicio express
    if (!citaInfo.esExpress && (!formData.horasEstimadas || parseFloat(formData.horasEstimadas) <= 0)) {
      newErrors.horasEstimadas = 'Las horas estimadas deben ser mayor a 0';
    }

    // Validar materiales
    const materialesValidos = materiales.filter(m => m.nombre.trim() && m.cantidad > 0 && m.precio > 0);
    if (totales.total <= 0) {
      newErrors.total = 'El total debe ser mayor a 0 (mano de obra + materiales)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Filtrar materiales válidos
      const materialesValidos = materiales.filter(m => 
        m.nombre.trim() && m.cantidad > 0 && m.precio > 0
      );
      
      onSubmit({
        manoDeObra: parseFloat(formData.manoDeObra) || 0,
        materiales: materialesValidos,
        descripcion: formData.descripcion.trim(),
        horasEstimadas: citaInfo.esExpress ? null : parseFloat(formData.horasEstimadas),
        metodoPago: formData.metodoPago,
        garantia: formData.garantia.trim(),
        observaciones: formData.observaciones.trim(),
        precio: totales.total // Total calculado
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleMaterialChange = (index, field, value) => {
    const newMateriales = [...materiales];
    
    if (field === 'cantidad') {
      // Para cantidad, mantener el valor como string si está vacío o usar parseInt
      if (value === '') {
        newMateriales[index][field] = '';
      } else {
        const parsedValue = parseInt(value);
        newMateriales[index][field] = isNaN(parsedValue) ? '' : parsedValue;
      }
    } else if (field === 'precio') {
      // Para precio, mantener el valor como string si está vacío o usar parseFloat
      if (value === '') {
        newMateriales[index][field] = '';
      } else {
        const parsedValue = parseFloat(value);
        newMateriales[index][field] = isNaN(parsedValue) ? '' : parsedValue;
      }
    } else {
      newMateriales[index][field] = value;
    }
    
    // Calcular total del material solo con valores válidos
    if (field === 'cantidad' || field === 'precio') {
      const cantidad = parseFloat(newMateriales[index].cantidad) || 0;
      const precio = parseFloat(newMateriales[index].precio) || 0;
      newMateriales[index].total = cantidad * precio;
    }
    
    setMateriales(newMateriales);
  };

  const addMaterial = () => {
    setMateriales([...materiales, { nombre: '', cantidad: '', precio: '', total: 0 }]);
  };

  const removeMaterial = (index) => {
    if (materiales.length > 1) {
      setMateriales(materiales.filter((_, i) => i !== index));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaMoneyBillWave className="text-green-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {citaInfo.servicio && (
          <div className="bg-gray-50 rounded p-3 mb-4">
            <p className="text-sm text-gray-600">
              <strong>Servicio:</strong> {citaInfo.servicio}
            </p>
            {citaInfo.descripcion && (
              <p className="text-sm text-gray-600 mt-1">
                <strong>Descripción:</strong> {citaInfo.descripcion}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección de Mano de Obra */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
              <FaWrench className="mr-2" />
              Mano de Obra
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo Mano de Obra ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.manoDeObra}
                  onChange={(e) => handleInputChange('manoDeObra', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.manoDeObra ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  disabled={isLoading}
                />
                {errors.manoDeObra && (
                  <p className="text-red-500 text-xs mt-1">{errors.manoDeObra}</p>
                )}
              </div>

              {!citaInfo.esExpress && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiempo Estimado (horas)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.horasEstimadas}
                    onChange={(e) => handleInputChange('horasEstimadas', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.horasEstimadas ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="2.5"
                    disabled={isLoading}
                  />
                  {errors.horasEstimadas && (
                    <p className="text-red-500 text-xs mt-1">{errors.horasEstimadas}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sección de Materiales */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-green-800 flex items-center">
                <FaBox className="mr-2" />
                Materiales
              </h3>
              <button
                type="button"
                onClick={addMaterial}
                className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 flex items-center"
                disabled={isLoading}
              >
                <FaPlus className="mr-1" size={12} />
                Agregar
              </button>
            </div>
            
            <div className="space-y-3">
              {materiales.map((material, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Material
                    </label>
                    <input
                      type="text"
                      value={material.nombre}
                      onChange={(e) => handleMaterialChange(index, 'nombre', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                      placeholder="Nombre del material"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cant.
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={material.cantidad}
                      onChange={(e) => handleMaterialChange(index, 'cantidad', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                      disabled={isLoading}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Precio $
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={material.precio}
                      onChange={(e) => handleMaterialChange(index, 'precio', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                      disabled={isLoading}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-700 mb-1">Total</div>
                      <div className="px-2 py-1 text-sm bg-gray-100 border rounded text-center">
                        ${material.total.toFixed(2)}
                      </div>
                    </div>
                    {materiales.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMaterial(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        disabled={isLoading}
                      >
                        <FaTrash size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de Totales */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Resumen</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600">Materiales</div>
                <div className="text-lg font-semibold text-green-600">${totales.materiales.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Mano de Obra</div>
                <div className="text-lg font-semibold text-blue-600">${totales.manoDeObra.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-xl font-bold text-gray-900">${totales.total.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Descripción del Trabajo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción del Trabajo
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.descripcion ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe detalladamente el trabajo a realizar..."
              rows={3}
              disabled={isLoading}
            />
            {errors.descripcion && (
              <p className="text-red-500 text-xs mt-1">{errors.descripcion}</p>
            )}
          </div>

          {/* Información Adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago
              </label>
              <select
                value={formData.metodoPago}
                onChange={(e) => handleInputChange('metodoPago', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Garantía
              </label>
              <input
                type="text"
                value={formData.garantia}
                onChange={(e) => handleInputChange('garantia', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 6 meses"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones adicionales..."
              rows={2}
              disabled={isLoading}
            />
          </div>

          {errors.total && (
            <div className="text-red-500 text-sm text-center">
              {errors.total}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creando...
                </>
              ) : (
                <>
                  <FaCheck size={16} />
                  Crear Cotización
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CotizacionModal;
