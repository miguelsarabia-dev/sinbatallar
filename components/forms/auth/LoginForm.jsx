"use client";
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FaUserAlt, FaLock, FaEye, FaEyeSlash, FaTools, FaUser, FaStore } from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import { esAsociado } from '@/lib/roles';

// Área de cada rol después de entrar.
const destinoDe = (role) => {
  if (esAsociado(role)) return '/asociado';
  switch (role) {
    case 'admin': return '/admin';
    case 'contratista': return '/contratista/dashboard';
    case 'aperturador': case 'especialista': case 'aspirante': case 'ferretero': case 'tecnico': return `/${role}`;
    default: return '/main/servicios-programables';
  }
};

export default function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // En la web se conserva el selector de tipo de cuenta (la app móvil ya detecta el rol sola)
  const [userType, setUserType] = useState('usuario');
  const { signIn, signInWithGoogle } = useAuth();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithGoogle(credentialResponse.credential);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        console.log('✅ Login con Google exitoso');
        window.location.href = destinoDe(result.user?.role);
      }
    } catch (error) {
      console.error('❌ Error en login con Google:', error);
      setError('Error al iniciar sesión con Google');
    }

    setLoading(false);
  };

  const handleGoogleError = () => {
    setError('Error al iniciar sesión con Google. Intenta nuevamente.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const esEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
      if (userType !== 'usuario' && !esEmail) {
        setError('Ingresa un email válido');
        setLoading(false);
        return;
      }
      // usuario: email o teléfono de 10 dígitos (el servidor resuelve la cuenta)
      const result = await signIn({
        ...(esEmail ? { email: identifier.trim() } : { telefono: identifier }),
        password,
        userType,
      });
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        window.location.href = destinoDe(result.user?.role);
        return;
      } else {
        setError('Error en el inicio de sesión');
      }
    } catch (error) {
      console.error('❌ Error general en login:', error);
      setError('Error de conexión. Intenta nuevamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col duration-300">
      {/* Header */}
      <div className="safe-area-top header-mobile px-6 py-4 bg-white border-b border-gray-200">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <img src="/images/sinbatallartext.png" alt="Sin Batallar" className="h-8 object-contain" width="140" height="32" />
          </div>
          <p className="text-gray-600 text-sm mt-1">Bienvenido de vuelta</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 bg-gray-50">
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
              <p className="text-gray-600">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selector de tipo de usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de cuenta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[['usuario', 'Usuario', FaUser], ['contratista', 'Contratista', FaTools], ['ferretero', 'Ferretería', FaStore]].map(([valor, etiqueta, Icono]) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setUserType(valor)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${userType === valor
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                        }`}
                    >
                      <Icono size={20} />
                      <span className="text-xs font-medium">{etiqueta}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Login - Solo para usuarios, no contratistas */}
              {userType === 'usuario' && (
                <div className="flex flex-col items-center">
                  <div className="w-full flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-sm text-gray-500">Acceso rápido</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text="signin_with"
                    shape="rectangular"
                    width="100%"
                    locale="es"
                  />
                  <div className="w-full flex items-center gap-3 mt-4">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-sm text-gray-500">o con tus credenciales</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                </div>
              )}

              {/* Email/Phone Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {userType === 'contratista' ? 'Email del Contratista' : userType === 'ferretero' ? 'Email de la Ferretería' : 'Email o Teléfono'}
                </label>
                <div className="input-container">
                  <div className="input-icon-left">
                    <FaUserAlt className="text-gray-400" size={16} />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder={
                      userType === 'contratista' ? 'contratista@email.com' :
                      userType === 'ferretero' ? 'ferreteria@email.com' :
                      'tu@email.com o 5512345678'
                    }
                    className="w-full h-14 pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="input-container">
                  <div className="input-icon-left">
                    <FaLock className="text-gray-400" size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className="w-full h-14 pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                    autoComplete="current-password"
                  />
                  <div className="input-icon-right">
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="text-red-600 text-sm font-medium">
                    {error}
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
                    Ingresando...
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-4">
            <div className="text-gray-600">
              ¿No tienes cuenta?{' '}
              <a
                href="/register/UserRegister"
                className="text-primary font-semibold hover:text-primary-hover"
              >
                Regístrate aquí
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
