"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUserAlt, FaLock, FaEnvelope, FaPhone, FaImage } from 'react-icons/fa';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterForm() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [foto, setFoto] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithGoogle(credentialResponse.credential);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess('¡Registro con Google exitoso!');
        console.log('✅ Registro/Login con Google exitoso');
        setTimeout(() => {
          window.location.href = '/main/servicios-programables';
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error en registro con Google:', error);
      setError('Error al registrarse con Google');
    }

    setLoading(false);
  };

  const handleGoogleError = () => {
    setError('Error al conectar con Google. Intenta nuevamente.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!/^\d{10}$/.test(telefono)) {
      setError('El teléfono debe tener 10 dígitos');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('email', email);
      formData.append('telefono', telefono);
      formData.append('password', password);
      if (foto) {
        formData.append('foto', foto);
      }
      formData.append('role', 'cliente'); // Cambiado de 'user' a 'cliente'
      const res = await fetch('/api/users', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Usuario registrado exitosamente');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        console.error('Error del servidor:', data);
        let errorMessage = data.error || 'Error al registrar usuario';
        if (data.details && Array.isArray(data.details)) {
          errorMessage = data.details.join(', ');
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="safe-area-top bg-white border-b border-neutral px-6 py-4">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <img src="/images/sinbatallartext.png" alt="Sin Batallar" className="h-8 object-contain" width="140" height="32" />
          </div>
          <p className="text-muted text-sm mt-1">Crear cuenta nueva</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 bg-neutral-light">
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-neutral p-6">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-secondary mb-2">Registro</h2>
              <p className="text-muted">Completa tus datos para comenzar</p>
            </div>

            {/* Google Register Button */}
            <div className="flex flex-col items-center mb-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="signup_with"
                shape="rectangular"
                width="100%"
                locale="es"
              />
              <div className="w-full flex items-center gap-3 mt-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-500">o con tus datos</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-5">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Nombre completo
                </label>
                <div className="relative">
                  <FaUserAlt className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted text-sm" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full h-14 pl-12 pr-4 py-3 border-2 border-neutral rounded-xl bg-white text-secondary placeholder-muted transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    autoComplete="name"
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
                    placeholder="tu@email.com"
                    className="w-full h-14 pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
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

              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto de perfil (opcional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setFoto(e.target.files[0])}
                    className="w-full h-14 px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="text-green-600 text-sm font-medium">
                    {success}
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
                  'Crear Cuenta'
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
              ¿Eres un contratista?{' '}
              <a
                href="/register/ContratistaRegister"
                className="text-primary font-semibold hover:text-primary-hover"
              >
                Registra tu empresa
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
