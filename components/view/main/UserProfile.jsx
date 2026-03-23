"use client";
import { useSession, signOut } from '@/contexts/AuthContext';
import { useState, useEffect, useRef } from "react";
import { FaUserAlt, FaEnvelope, FaPhone, FaImage, FaLock, FaSave, FaEdit, FaCheck, FaTimes, FaCalendarAlt, FaClipboardList, FaMapMarkerAlt, FaPlus, FaTrash, FaStar } from "react-icons/fa";
import { Modal } from "../../ui";
import { useModal } from "../../../hooks/useModal";
import DireccionFormConMapa from "../../forms/DireccionFormConMapa";

export default function UserProfile() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [editField, setEditField] = useState(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para manejo de direcciones
  const [showDireccionesModal, setShowDireccionesModal] = useState(false);
  const [direccionEditando, setDireccionEditando] = useState(null);
  const [modoEdicion, setModoEdicion] = useState('agregar'); // 'agregar', 'editar', 'principal'
  const [direcciones, setDirecciones] = useState([]);

  // Estados para eliminación de cuenta
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fileInputRef = useRef();
  const { modalState, showModal, showSuccess, showError, showWarning, hideModal } = useModal();

  // Cargar datos del usuario autenticado
  useEffect(() => {
    if (session?.user?.email) {
      fetch(`/api/users?id=${encodeURIComponent(session.user.email)}`)
        .then(async res => {
          const data = await res.json();
          setUser(data);
          setNombre(data.nombre || "");
          setTelefono(data.telefono || "");

          // Cargar direcciones desde el array direcciones del usuario
          const todasDirecciones = [];

          // Verificar si hay direcciones en el array
          if (data.direcciones && data.direcciones.length > 0) {
            data.direcciones.forEach((dir, index) => {
              todasDirecciones.push({
                ...dir,
                id: dir._id || `dir-${index}`,
                esPrincipal: index === 0, // La primera es la principal
                alias: `Dirección ${index + 1}`
              });
            });
          }
          setDirecciones(todasDirecciones);

          // Cargar foto desde Cloudinary URL
          if (data.fotoUrl) {
            setFotoPreview(data.fotoUrl);
          }
        })
        .catch(error => {
          console.error('Error al cargar el usuario:', error);
          setError('Error al cargar los datos del usuario');
        });
    }
  }, [session]);

  // Manejar cambio de foto
  useEffect(() => {
    if (foto) {
      const url = URL.createObjectURL(foto);
      setFotoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [foto]);

  const handleSaveField = async (field) => {
    if (!user) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let updateData = { id: user._id };

      if (field === 'nombre') {
        updateData.nombre = nombre;
      } else if (field === 'telefono') {
        if (!/^\d{10}$/.test(telefono)) {
          setError('El teléfono debe tener 10 dígitos');
          setLoading(false);
          return;
        }
        updateData.telefono = telefono;
      } else if (field === 'foto' && foto) {
        // Subir foto a Cloudinary primero
        const formDataFoto = new FormData();
        formDataFoto.append('foto', foto);
        formDataFoto.append('userId', user._id);

        const uploadRes = await fetch('/api/upload/foto-perfil', {
          method: 'POST',
          body: formDataFoto
        });

        if (!uploadRes.ok) {
          throw new Error('Error al subir la foto');
        }

        const { url, publicId } = await uploadRes.json();
        updateData.fotoUrl = url;
        updateData.fotoPublicId = publicId;
      } else if (field === 'password') {
        if (password.length < 6) {
          showError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        updateData.password = password;
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        if (field === 'foto' && updatedUser.fotoUrl) {
          setFotoPreview(updatedUser.fotoUrl);
        }
        showSuccess('Datos actualizados correctamente');
        setEditField(null);
        setPassword("");
        setFoto(null);
      } else {
        const data = await res.json();
        showError(data.error || 'Error al actualizar');
      }
    } catch (err) {
      showError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditField(null);
    setNombre(user?.nombre || "");
    setTelefono(user?.telefono || "");
    setFoto(null);
    setPassword("");
    setError("");
    setSuccess("");
    setShowPasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const handlePasswordModalSave = () => {
    setPasswordError("");
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }
    setPassword(newPassword);
    setShowPasswordModal(false);
    handleSaveField("password");
  };

  // Funciones para manejo de direcciones
  const abrirModalDirecciones = (modo = 'agregar', direccion = null) => {
    setModoEdicion(modo);
    setDireccionEditando(direccion);
    setShowDireccionesModal(true);
  };

  const cerrarModalDirecciones = () => {
    setShowDireccionesModal(false);
    setDireccionEditando(null);
    setModoEdicion('agregar');
  };

  const guardarDireccion = async (direccionData) => {
    if (!user) return;

    setLoading(true);
    try {
      let endpoint = '/api/users/direcciones';
      let method = 'POST';
      let body = {
        userId: user._id,
        direccion: direccionData
      };

      if (modoEdicion === 'editar' && direccionEditando) {
        method = 'PUT';
        body.direccionId = direccionEditando.id;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la dirección');
      }

      const result = await response.json();
      showSuccess('Dirección guardada correctamente');

      // Recargar datos del usuario
      const userResponse = await fetch(`/api/users?id=${encodeURIComponent(session.user.email)}`);
      const userData = await userResponse.json();
      setUser(userData);

      // Actualizar direcciones desde el array
      const todasDirecciones = [];
      if (userData.direcciones && userData.direcciones.length > 0) {
        userData.direcciones.forEach((dir, index) => {
          todasDirecciones.push({
            ...dir,
            id: dir._id || `dir-${index}`,
            esPrincipal: index === 0,
            alias: `Dirección ${index + 1}`
          });
        });
      }
      setDirecciones(todasDirecciones);

      cerrarModalDirecciones();

    } catch (error) {
      console.error('Error al guardar dirección:', error);
      showError('Error al guardar la dirección: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminarDireccion = async (direccionId) => {
    if (!user) return;

    // Si solo tiene una dirección, no permitir eliminarla
    if (direcciones.length === 1) {
      showWarning('No puedes eliminar tu única dirección. Agrega otra dirección primero.');
      return;
    }

    // Usar el modal personalizado existente para confirmar eliminación
    showModal({
      title: 'Eliminar Dirección',
      message: '¿Estás seguro de que quieres eliminar esta dirección? Esta acción no se puede deshacer.',
      type: 'warning',
      showCancel: true,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/users/direcciones', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user._id,
              direccionId: direccionId
            }),
          });

          const responseData = await response.json();

          if (!response.ok) {
            throw new Error(responseData.error || 'Error al eliminar la dirección');
          }

          showSuccess('Dirección eliminada correctamente');

          // Recargar direcciones del usuario
          const userResponse = await fetch(`/api/users?id=${encodeURIComponent(session.user.email)}`);
          const userData = await userResponse.json();
          setUser(userData);

          const todasDirecciones = [];
          if (userData.direcciones && userData.direcciones.length > 0) {
            userData.direcciones.forEach((dir, index) => {
              todasDirecciones.push({
                ...dir,
                id: dir._id || `dir-${index}`,
                esPrincipal: index === 0,
                alias: `Dirección ${index + 1}`
              });
            });
          }
          setDirecciones(todasDirecciones);

        } catch (error) {
          console.error('Error al eliminar dirección:', error);
          showError('Error al eliminar la dirección: ' + error.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') return;

    setDeletingAccount(true);
    try {
      const response = await fetch(`/api/users?id=${user._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar la cuenta');
      }

      // Limpiar sesión local
      localStorage.removeItem('auth-token');
      localStorage.removeItem('auth-user');
      document.cookie = 'auth-token=; path=/; max-age=0';

      signOut({ callbackUrl: '/' });
    } catch (error) {
      showError('Error al eliminar la cuenta: ' + error.message);
      setDeletingAccount(false);
    }
  };

  const establecerComoPrincipal = async (direccion) => {
    if (direccion.esPrincipal || !user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/users/direcciones/principal', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user._id,
          direccionId: direccion.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al establecer como principal');
      }

      showSuccess('Dirección principal actualizada');

      // Recargar datos
      const userResponse = await fetch(`/api/users?id=${encodeURIComponent(session.user.email)}`);
      const userData = await userResponse.json();
      setUser(userData);

      const todasDirecciones = [];
      if (userData.direcciones && userData.direcciones.length > 0) {
        userData.direcciones.forEach((dir, index) => {
          todasDirecciones.push({
            ...dir,
            id: dir._id || `dir-${index}`,
            esPrincipal: index === 0,
            alias: `Dirección ${index + 1}`
          });
        });
      }
      setDirecciones(todasDirecciones);

    } catch (error) {
      console.error('Error al establecer como principal:', error);
      showError('Error al establecer como principal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-900">
          <p className="text-red-600">No estás autenticado</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-white border-b border-gray-200 px-6 py-4">
        <div className="text-center">
          <h1 className="font-montserrat font-black text-2xl text-primary">Mi Perfil</h1>
          <p className="text-gray-600 text-sm mt-1">Gestiona tu información personal</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-sm sm:max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
            {/* Foto de perfil */}
            <div className="flex flex-col items-center mb-6 sm:mb-8">
              <div className="relative">
                <img
                  src={fotoPreview || "/images/default-avatar.svg"}
                  alt="Foto de perfil"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-full border-4 border-gray-300 bg-gray-100 shadow-lg"
                  onError={(e) => {
                    // Si falla la carga, usar un placeholder con iniciales
                    e.target.style.display = 'none';
                    e.target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                {/* Placeholder con iniciales si no hay foto */}
                <div className="hidden w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-gray-300 bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex items-center justify-center text-white font-bold text-2xl sm:text-3xl">
                  {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                </div>
                <button
                  type="button"
                  onClick={() => setEditField('foto') || fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-primary text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-lg hover:bg-primary-hover flex items-center justify-center"
                  title="Cambiar foto"
                >
                  <FaEdit size={12} className="sm:hidden" />
                  <FaEdit size={14} className="hidden sm:block" />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={e => {
                    if (e.target.files[0]) {
                      setFoto(e.target.files[0]);
                      handleSaveField('foto');
                    }
                  }}
                  disabled={loading}
                />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-3 sm:mt-4">{user.nombre}</h2>
              <p className="text-gray-600 text-xs sm:text-sm">{user.email}</p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Nombre */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Nombre completo
                </label>
                <div className="relative">
                  <FaUserAlt className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-700 text-xs sm:text-sm" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    className={`w-full h-12 sm:h-14 pl-10 sm:pl-12 pr-10 sm:pr-12 rounded-xl border-2 transition-all outline-none text-sm sm:text-base ${editField === 'nombre'
                      ? 'border-primary bg-white text-gray-900'
                      : 'border-gray-300 bg-white text-gray-900'
                      } ${editField !== 'nombre' ? 'cursor-default' : ''}`}
                    required
                    autoComplete="name"
                    disabled={editField !== 'nombre' || loading}
                  />
                  {editField === 'nombre' ? (
                    <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 flex space-x-1 sm:space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSaveField('nombre')}
                        disabled={loading}
                        className="text-green-600 hover:text-green-700"
                        title="Guardar"
                      >
                        <FaCheck size={14} className="sm:hidden" />
                        <FaCheck size={16} className="hidden sm:block" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700"
                        title="Cancelar"
                      >
                        <FaTimes size={14} className="sm:hidden" />
                        <FaTimes size={16} className="hidden sm:block" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditField('nombre')}
                      disabled={loading}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-700 hover:text-gray-300"
                      title="Editar nombre"
                    >
                      <FaEdit size={14} className="sm:hidden" />
                      <FaEdit size={16} className="hidden sm:block" />
                    </button>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-700 text-sm" />
                  <input
                    type="email"
                    value={user.email}
                    className="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-gray-300 bg-white text-gray-700 cursor-not-allowed"
                    disabled
                    autoComplete="email"
                  />
                </div>
                <p className="text-xs text-gray-700 mt-1">El email no se puede modificar</p>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Teléfono
                </label>
                <div className="relative">
                  <FaPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-700 text-sm" />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                    placeholder="Tu número de teléfono"
                    className={`w-full h-14 pl-12 pr-12 rounded-xl border-2 transition-all outline-none ${editField === 'telefono'
                      ? 'border-primary bg-white text-gray-900'
                      : 'border-gray-300 bg-white text-gray-900'
                      } ${editField !== 'telefono' ? 'cursor-default' : ''}`}
                    required
                    autoComplete="tel"
                    maxLength={10}
                    pattern="\d{10}"
                    disabled={editField !== 'telefono' || loading}
                  />
                  {editField === 'telefono' ? (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSaveField('telefono')}
                        disabled={loading}
                        className="text-green-600 hover:text-green-700"
                        title="Guardar"
                      >
                        <FaCheck size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700"
                        title="Cancelar"
                      >
                        <FaTimes size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditField('telefono')}
                      disabled={loading}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-700 hover:text-gray-300"
                      title="Editar teléfono"
                    >
                      <FaEdit size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Cambiar contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full text-left"
                >
                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-700 text-sm" />
                    <div className="w-full h-14 pl-12 pr-12 rounded-xl border-2 border-gray-300 bg-white text-gray-700 cursor-pointer flex items-center">
                      ••••••••
                    </div>
                    <FaEdit className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-700" size={16} />
                  </div>
                </button>
              </div>

              {/* Mis Direcciones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Mis Direcciones</h3>
                  <button
                    onClick={() => abrirModalDirecciones('agregar')}
                    className="text-primary hover:text-primary-hover text-sm font-medium flex items-center"
                    disabled={loading}
                  >
                    <FaPlus size={12} className="mr-1" />
                    Añadir
                  </button>
                </div>

                {direcciones.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <FaMapMarkerAlt className="mx-auto text-gray-400 text-2xl mb-2" />
                    <p className="text-gray-500 text-sm mb-3">No tienes direcciones guardadas</p>
                    <button
                      onClick={() => abrirModalDirecciones('agregar')}
                      className="text-primary hover:text-primary-hover text-sm font-medium"
                      disabled={loading}
                    >
                      Añadir tu primera dirección
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {direcciones.map((direccion) => (
                      <div
                        key={direccion.id}
                        className={`p-3 rounded-xl border-2 ${direccion.esPrincipal
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 bg-white'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center mb-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {direccion.alias}
                              </h4>
                              {direccion.esPrincipal && (
                                <FaStar className="ml-2 text-yellow-500 text-xs flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {`${direccion.calle}${direccion.numeroCasa ? ` ${direccion.numeroCasa}` : ''}${direccion.colonia ? `, ${direccion.colonia}` : ''}${direccion.municipio ? `, ${direccion.municipio}` : ''}${direccion.estado ? `, ${direccion.estado}` : ''}`}
                            </p>
                          </div>

                          <div className="flex items-center ml-2 space-x-1">
                            <button
                              onClick={() => abrirModalDirecciones('editar', direccion)}
                              className="text-gray-400 hover:text-primary p-1"
                              disabled={loading}
                              title="Editar dirección"
                            >
                              <FaEdit size={12} />
                            </button>
                            {!direccion.esPrincipal && (
                              <>
                                <button
                                  onClick={() => establecerComoPrincipal(direccion)}
                                  className="text-gray-400 hover:text-yellow-500 p-1"
                                  disabled={loading}
                                  title="Establecer como dirección principal"
                                >
                                  <FaStar size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    console.log('Intentando eliminar dirección:', direccion); // Debug
                                    eliminarDireccion(direccion.id);
                                  }}
                                  className="text-gray-400 hover:text-red-500 p-1"
                                  disabled={loading}
                                  title="Eliminar esta dirección"
                                >
                                  <FaTrash size={12} />
                                </button>
                              </>
                            )}
                            {direccion.esPrincipal && (
                              <span className="text-xs text-gray-500 px-2">
                                Principal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cerrar sesión */}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full mt-8 bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 shadow-lg"
            >
              Cerrar sesión
            </button>

            {/* Zona de peligro - Eliminar cuenta */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              {!showDeleteSection ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteSection(true)}
                  className="w-full text-red-400 text-sm font-medium py-2 hover:text-red-600 transition-colors underline underline-offset-2"
                >
                  Eliminar mi cuenta
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h4 className="text-red-700 font-bold text-sm mb-2">⚠️ Eliminar cuenta permanentemente</h4>
                    <p className="text-red-600 text-xs leading-relaxed mb-4">
                      Esta acción es <strong>irreversible</strong>. Se eliminarán de forma permanente
                      tu cuenta, todas tus direcciones guardadas y todos tus datos personales.
                      No podrás recuperar esta información.
                    </p>
                    <p className="text-gray-700 text-xs mb-3">
                      Para confirmar, escribe{' '}
                      <strong className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-700">ELIMINAR</strong>{' '}
                      en el campo de abajo:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="Escribe ELIMINAR para confirmar"
                      className="w-full h-12 px-4 rounded-xl border-2 border-red-200 bg-white text-gray-900 outline-none focus:border-red-500 text-sm font-mono placeholder:font-sans placeholder:text-gray-400"
                      disabled={deletingAccount}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => { setShowDeleteSection(false); setDeleteConfirmText(''); }}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                      disabled={deletingAccount}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'ELIMINAR' || deletingAccount}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {deletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal cambiar contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Cambiar contraseña</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full h-14 px-4 rounded-xl border-2 border-gray-300 bg-white text-gray-900 outline-none focus:border-primary"
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full h-14 px-4 rounded-xl border-2 border-gray-300 bg-white text-gray-900 outline-none focus:border-primary"
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                {passwordError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <div className="text-red-600 text-sm font-medium">
                      {passwordError}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300:bg-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePasswordModalSave}
                  className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestión de Direcciones */}
      {showDireccionesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {modoEdicion === 'agregar' ? 'Añadir Dirección' :
                    modoEdicion === 'editar' ? 'Editar Dirección' :
                      'Dirección Principal'}
                </h3>
                <button
                  onClick={cerrarModalDirecciones}
                  className="text-gray-400 hover:text-gray-600 p-2"
                  disabled={loading}
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            <div className="p-0">


              {/* Formulario de dirección */}
              <div className="px-6 py-4">
                <DireccionFormConMapa
                  isOpen={true}
                  onClose={cerrarModalDirecciones}
                  onSave={(direccionData) => {
                    guardarDireccion(direccionData);
                  }}
                  initialData={direccionEditando || {}}
                  title={direccionEditando ? "Editar Dirección" : "Nueva Dirección"}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
  );
}
