"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaUserAlt, FaLock, FaEnvelope, FaPhone, FaMapMarkerAlt, FaEye, FaEyeSlash, FaTools, FaCog } from 'react-icons/fa';
import { Modal } from "../../ui";
import { useModal } from "../../../hooks/useModal";
import dynamic from 'next/dynamic';

// Importar LeafletMap dinámicamente para evitar SSR issues
const LeafletMap = dynamic(() => import('../../maps/LeafletMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
    <span className="text-gray-500">Cargando mapa...</span>
  </div>
});

export default function RegisterContratista() {
  const { modalState, showError, hideModal } = useModal();
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para el mapa
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [tempLocation, setTempLocation] = useState(null); // Ubicación temporal antes de confirmar
  const [showMap, setShowMap] = useState(false);
  
  const router = useRouter();

    useEffect(() => {
    // Obtener servicios disponibles
    const fetchServicios = async () => {
      try {
        const response = await fetch('/api/servicios');
        if (response.ok) {
          const data = await response.json();
          setServicios(data);
        }
      } catch (error) {
        console.error('Error al obtener servicios:', error);
      }
    };

    fetchServicios();

    // Intentar obtener la ubicación del usuario (solo para centrar el mapa)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
        },
        (error) => {
          console.log('No se pudo obtener la ubicación del usuario:', error);
          showError(
            "Es necesario permitir el acceso a la ubicación para registrar un contratista.",
            "Ubicación requerida",
            () => {
              hideModal();
              router.push('/login');
            }
          );
          return;
        }
      );
    } else {
      showError(
        "Tu dispositivo no soporta geolocalización. No puedes registrar un contratista.",
        "Funcionalidad no disponible",
        () => {
          hideModal();
          router.push('/login');
        }
      );
      return;
    }
  }, [router]);

  const toggleServicio = (servicioId) => {
    setServiciosSeleccionados(prev =>
      prev.includes(servicioId)
        ? prev.filter(id => id !== servicioId)
        : [...prev, servicioId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!/^\d{10}$/.test(telefono)) {
      setError('El teléfono debe tener 10 dígitos');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (serviciosSeleccionados.length === 0) {
      setError('Selecciona al menos un servicio');
      return;
    }
    if (!selectedLocation) {
      setError('Debes seleccionar una ubicación en el mapa');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contratistas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          direccion,
          telefono,
          email,
          password,
          servicios: serviciosSeleccionados,
          ubicacion: selectedLocation,
          activo: false, // Los contratistas necesitan aprobación
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Solicitud enviada exitosamente. Esperando aprobación.');
        setTimeout(() => router.push('/'), 3000);
      } else {
        setError(data.error || 'Error al enviar solicitud');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Manejar la selección temporal de ubicación desde el mapa
  const handleLocationSelect = (coordinates) => {
    const [lat, lng] = coordinates;
    const location = { lat, lng };
    setTempLocation(location);
  };

  // Confirmar la ubicación seleccionada
  const confirmLocation = async () => {
    if (tempLocation) {
      setSelectedLocation(tempLocation);
      setShowMap(false);
      
      // Obtener la dirección de la ubicación confirmada
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${tempLocation.lat}&lon=${tempLocation.lng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        if (data && data.display_name) {
          setDireccion(data.display_name);
        }
      } catch (error) {
        console.error('Error al obtener la dirección:', error);
      }
      
      setTempLocation(null);
    }
  };

  // Cancelar selección de ubicación
  const cancelLocationSelection = () => {
    setTempLocation(null);
    setShowMap(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-white border-b border-gray-200 px-6 py-4">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <img src="/images/sinbatallartext.png" alt="Sin Batallar" className="h-8 object-contain" width="140" height="32" />
          </div>
          <p className="text-gray-600 text-sm mt-1">Registro de contratista</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 px-6 py-8 bg-gray-50">
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registra tu empresa</h2>
              <p className="text-gray-600">Únete a nuestra red de contratistas</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Selección de servicios */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Servicios que ofreces
                </label>
                <div className="flex flex-wrap gap-2">
                  {servicios.length === 0 && (
                    <span className="text-gray-500 text-sm">Cargando servicios...</span>
                  )}
                  {servicios.map(servicio => (
                    <button
                      type="button"
                      key={servicio._id}
                      onClick={() => toggleServicio(servicio._id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        serviciosSeleccionados.includes(servicio._id)
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {servicio.nombre}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Nombre del contratista */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la empresa
                </label>
                <div className="relative">
                  <FaTools className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Empresa de Servicios XYZ"
                    className="w-full h-14 pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    autoComplete="organization"
                  />
                </div>
              </div>
              
              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección completa
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                    placeholder="Calle, número, colonia, ciudad..."
                    className="w-full h-14 pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Ubicación en mapa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ubicación en el mapa
                </label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className="w-full px-4 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:border-primary hover:text-primary transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FaMapMarkerAlt className="text-sm" />
                    {selectedLocation ? 'Cambiar ubicación en el mapa' : 'Seleccionar ubicación en el mapa'}
                  </button>
                  
                  {selectedLocation && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-green-600 text-sm" />
                        <span className="text-green-600 text-sm font-medium">
                          ✓ Ubicación confirmada en el mapa
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {showMap && userLocation && (
                    <div className="space-y-3">
                      <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: '300px' }}>
                        <LeafletMap
                          userLocation={userLocation}
                          onSelect={handleLocationSelect}
                          markerLocation={tempLocation ? [tempLocation.lat, tempLocation.lng] : (selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : null)}
                          markerLabel="Ubicación del contratista"
                        />
                      </div>
                      
                      {tempLocation && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-600 text-sm mb-3">
                            📍 Punto seleccionado en el mapa
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={confirmLocation}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                              ✓ Confirmar ubicación
                            </button>
                            <button
                              type="button"
                              onClick={cancelLocationSelection}
                              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                            >
                              ✕ Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {!tempLocation && (
                        <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
                          <p className="text-gray-600 text-sm text-center">
                            Haz clic en el mapa para seleccionar la ubicación de tu empresa
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono de la empresa
                </label>
                <div className="relative">
                  <FaPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                    placeholder="5512345678"
                    className="w-full h-14 pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    autoComplete="tel"
                    maxLength={10}
                    pattern="\d{10}"
                  />
                </div>
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="w-full h-14 pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              
              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full h-14 pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>
              
              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full h-14 pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>
              
              {/* Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="text-red-600 text-sm font-medium">
                    {error}
                  </div>
                </div>
              )}
              
              {message && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="text-green-600 text-sm font-medium">
                    {message}
                  </div>
                </div>
              )}
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Registrando...
                  </div>
                ) : (
                  'Registrar empresa'
                )}
              </button>
            </form>
          </div>
          
          {/* Footer Links */}
          <div className="mt-8 text-center space-y-4">
            <div className="text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <a
                href="/"
                className="text-primary font-semibold hover:text-primary-hover"
              >
                Inicia sesión
              </a>
            </div>
            <div className="text-gray-600 text-sm">
              ¿Eres usuario?{' '}
              <a
                href="/register/UserRegister"
                className="text-primary font-semibold hover:text-primary-hover"
              >
                Regístrate como usuario
              </a>
            </div>
          </div>
        </div>

        <Modal
          isOpen={modalState.isOpen}
          onClose={hideModal}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          onConfirm={modalState.onConfirm}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          showCancel={modalState.showCancel}
        />
      </div>
    </div>
  );
}
