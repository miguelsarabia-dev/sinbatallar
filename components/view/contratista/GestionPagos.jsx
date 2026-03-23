// components/view/contratista/GestionPagos.jsx
import React, { useState, useEffect } from 'react';
import { FaUniversity, FaSave, FaEdit, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { useSession } from '@/contexts/AuthContext';
import { useModal } from '../../../hooks/useModal';
import Modal from '../../ui/Modal';

const GestionPagos = ({ contratistaId }) => {
  const { data: session } = useSession();
  const [informacionPago, setInformacionPago] = useState({
    banco: '',
    numeroCuenta: '',
    clabe: '',
    nombreTitular: ''
  });
  const [modoEdicion, setModoEdicion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [mensaje, setMensaje] = useState('');

  const { modalState, showConfirm, hideModal, showSuccess, showError } = useModal();

  useEffect(() => {
    if (contratistaId) {
      cargarInformacionPago();
    }
  }, [contratistaId]);

  const cargarInformacionPago = async () => {
    try {
      const response = await fetch(`/api/contratistas/${contratistaId}/pago`);
      if (response.ok) {
        const data = await response.json();
        // Asegurar que todos los valores sean strings válidos
        setInformacionPago({
          banco: data.informacionPago?.banco || '',
          numeroCuenta: data.informacionPago?.numeroCuenta || '',
          clabe: data.informacionPago?.clabe || '',
          nombreTitular: data.informacionPago?.nombreTitular || ''
        });
        // Si no hay información de pago, activar modo edición
        if (!data.informacionPago?.banco) {
          setModoEdicion(true);
        }
      }
    } catch (error) {
      console.error('Error al cargar información de pago:', error);
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!informacionPago.banco?.trim()) {
      nuevosErrores.banco = 'El nombre del banco es obligatorio';
    }

    if (!informacionPago.numeroCuenta?.trim()) {
      nuevosErrores.numeroCuenta = 'El número de cuenta es obligatorio';
    } else if (!/^\d+$/.test(informacionPago.numeroCuenta.trim())) {
      nuevosErrores.numeroCuenta = 'El número de cuenta debe ser numérico';
    }

    if (!informacionPago.clabe?.trim()) {
      nuevosErrores.clabe = 'La CLABE es obligatoria';
    } else if (!/^\d{18}$/.test(informacionPago.clabe.trim())) {
      nuevosErrores.clabe = 'La CLABE debe tener exactamente 18 dígitos';
    }

    if (!informacionPago.nombreTitular?.trim()) {
      nuevosErrores.nombreTitular = 'El nombre del titular es obligatorio';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const confirmarGuardar = () => {
    if (!validarFormulario()) return;

    showConfirm(
      '¿Estás seguro de que la información bancaria es correcta? Esta cuenta será utilizada para recibir tus pagos.',
      guardarInformacion,
      'Confirmar Información Bancaria'
    );
  };

  const guardarInformacion = async () => {
    // Cerrar modal de confirmación antes de iniciar
    hideModal();
    setLoading(true);

    try {
      const response = await fetch(`/api/contratistas/${contratistaId}/pago`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(informacionPago)
      });

      const data = await response.json();

      if (response.ok) {
        setInformacionPago(data.informacionPago);
        setModoEdicion(false);
      } else {
        setErrors({ general: data.error || 'Error al guardar la información' });
        showError(data.error || 'Error al guardar la información');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setErrors({ general: 'Error de conexión' });
      showError('Error de conexión al guardar los datos');
    } finally {
      setLoading(false);
    }
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setErrors({});
    cargarInformacionPago();
  };

  const handleInputChange = (field, value) => {
    setInformacionPago(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo específico
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const tieneInformacionCompleta = informacionPago.banco && informacionPago.numeroCuenta &&
    informacionPago.clabe && informacionPago.nombreTitular;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FaUniversity className="text-green-600 text-xl" />
          <h2 className="text-xl font-bold text-gray-800">Información Bancaria</h2>
        </div>
        {!modoEdicion && (
          <button
            onClick={() => setModoEdicion(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaEdit />
            <span>Editar</span>
          </button>
        )}
      </div>

      {mensaje && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 flex items-center">
          <FaCheck className="mr-2" />
          {mensaje}
        </div>
      )}

      {errors.general && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
          {errors.general}
        </div>
      )}

      {!tieneInformacionCompleta && !modoEdicion && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 flex items-center">
          <FaInfoCircle className="mr-2" />
          <span>Completa tu información bancaria para recibir pagos de los clientes</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Banco */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Banco *
            </label>
            {modoEdicion ? (
              <div>
                <input
                  type="text"
                  value={informacionPago.banco}
                  onChange={(e) => handleInputChange('banco', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.banco ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Ej: BBVA, Santander, Banamex..."
                />
                {errors.banco && (
                  <p className="mt-1 text-sm text-red-600">{errors.banco}</p>
                )}
              </div>
            ) : (
              <p className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                {informacionPago.banco || 'No especificado'}
              </p>
            )}
          </div>

          {/* Titular */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Titular *
            </label>
            {modoEdicion ? (
              <div>
                <input
                  type="text"
                  value={informacionPago.nombreTitular}
                  onChange={(e) => handleInputChange('nombreTitular', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.nombreTitular ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Nombre completo del titular"
                />
                {errors.nombreTitular && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombreTitular}</p>
                )}
              </div>
            ) : (
              <p className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                {informacionPago.nombreTitular || 'No especificado'}
              </p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Número de cuenta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Cuenta *
            </label>
            {modoEdicion ? (
              <div>
                <input
                  type="text"
                  value={informacionPago.numeroCuenta}
                  onChange={(e) => handleInputChange('numeroCuenta', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.numeroCuenta ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Solo números"
                />
                {errors.numeroCuenta && (
                  <p className="mt-1 text-sm text-red-600">{errors.numeroCuenta}</p>
                )}
              </div>
            ) : (
              <p className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                {informacionPago.numeroCuenta || 'No especificado'}
              </p>
            )}
          </div>

          {/* CLABE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CLABE Interbancaria *
            </label>
            {modoEdicion ? (
              <div>
                <input
                  type="text"
                  value={informacionPago.clabe}
                  onChange={(e) => handleInputChange('clabe', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.clabe ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="18 dígitos"
                  maxLength="18"
                />
                {errors.clabe && (
                  <p className="mt-1 text-sm text-red-600">{errors.clabe}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  La CLABE debe tener exactamente 18 dígitos
                </p>
              </div>
            ) : (
              <p className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                {informacionPago.clabe || 'No especificado'}
              </p>
            )}
          </div>
        </div>

        {/* Botones de acción en modo edición */}
        {modoEdicion && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={confirmarGuardar}
              disabled={loading}
              className="flex items-center justify-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaSave />
              <span>{loading ? 'Guardando...' : 'Guardar'}</span>
            </button>
            <button
              onClick={cancelarEdicion}
              disabled={loading}
              className="flex items-center justify-center space-x-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <FaTimes />
              <span>Cancelar</span>
            </button>
          </div>
        )}

        {/* Información adicional */}
        {tieneInformacionCompleta && !modoEdicion && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-700">
              <FaCheck className="mr-2" />
              <span className="font-medium">Información bancaria completa</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Los clientes podrán realizar transferencias SPEI a esta cuenta cuando acepten tus cotizaciones.
            </p>
            {informacionPago.actualizado && (
              <p className="text-xs text-green-500 mt-2">
                Última actualización: {new Date(informacionPago.actualizado).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmación y feedback */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        {...modalState}
      />
    </div>
  );
};

export default GestionPagos;