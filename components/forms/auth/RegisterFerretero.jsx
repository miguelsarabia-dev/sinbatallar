"use client";
import { useState } from 'react';
import { FaUserAlt, FaLock, FaEnvelope, FaPhone, FaStore, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';

export default function RegisterFerretero() {
  const [form, setForm] = useState({
    nombre: '',
    nombreNegocio: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ferreteros/solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          nombreNegocio: form.nombreNegocio.trim(),
          email: form.email.trim().toLowerCase(),
          telefono: form.telefono.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al enviar la solicitud');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Solicitud enviada!</h2>
          <p className="text-gray-600 text-sm mb-6">
            Tu solicitud para registrar <span className="font-semibold">{form.nombreNegocio}</span> ha sido recibida.
            Un administrador revisará tu información y activará tu cuenta. Te notificaremos por correo.
          </p>
          <a
            href="/login"
            className="block w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Volver al login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <img src="/images/sinbatallartext.png" alt="Sin Batallar" className="h-8 object-contain" width="140" height="32" />
          </div>
          <p className="text-gray-600 text-sm mt-1">Registro de proveedor de materiales</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 bg-gray-50">
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">

            {/* Título */}
            <div className="mb-6 text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaStore size={24} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Únete como Ferretería</h2>
              <p className="text-gray-500 text-sm mt-1">
                Tu cuenta será activada por un administrador antes de poder acceder.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre del responsable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del responsable *</label>
                <div className="relative">
                  <FaUserAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={set('nombre')}
                    placeholder="Tu nombre completo"
                    className="w-full h-12 pl-11 pr-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              {/* Nombre del negocio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la ferretería *</label>
                <div className="relative">
                  <FaStore className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={form.nombreNegocio}
                    onChange={set('nombreNegocio')}
                    placeholder="Ej: Ferretería El Clavo"
                    className="w-full h-12 pl-11 pr-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="ferreteria@email.com"
                    className="w-full h-12 pl-11 pr-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de contacto</label>
                <div className="relative">
                  <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={set('telefono')}
                    placeholder="5512345678"
                    className="w-full h-12 pl-11 pr-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full h-12 pl-11 pr-12 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    placeholder="Repite tu contraseña"
                    className="w-full h-12 pl-11 pr-12 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Aviso de aprobación */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-amber-700 text-xs">
                  <span className="font-semibold">Nota:</span> Tu solicitud será revisada por nuestro equipo. Recibirás un correo cuando tu cuenta esté activa.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Enviando solicitud...</>
                ) : (
                  'Enviar solicitud'
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-primary font-semibold hover:text-primary/80">
              Inicia sesión aquí
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
