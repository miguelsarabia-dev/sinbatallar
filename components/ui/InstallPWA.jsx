'use client';

import { useState, useEffect } from 'react';
import { FaMobileAlt, FaTimes, FaApple, FaAndroid, FaShareAlt, FaPlusSquare } from 'react-icons/fa';
import useInstallPWA from '../../hooks/useInstallPWA';

export default function InstallPWA() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);
  const { 
    isInstallable, 
    isInstalled, 
    canPromptInstall,
    promptInstall,
    isIOS,
    isAndroid,
    isDesktop
  } = useInstallPWA();

  useEffect(() => {
    // Verificar si el usuario ya dismissió el prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = parseInt(dismissed);
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedDate < sevenDaysInMs) {
        setUserDismissed(true);
        return;
      }
    }

    // Si ya está instalada o no es instalable, no mostrar
    if (isInstalled || !isInstallable) {
      return;
    }

    // Para iOS en Safari, mostrar instrucciones después de 5 segundos
    if (isIOS()) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Para Android y otros navegadores que soporten beforeinstallprompt
    if (canPromptInstall) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, canPromptInstall, isIOS]);

  const handleInstallAndroid = async () => {
    try {
      const result = await promptInstall();
      if (result.outcome === 'accepted') {
        console.log('Usuario aceptó la instalación');
        setShowPrompt(false);
      } else if (result.outcome === 'dismissed') {
        console.log('Usuario rechazó la instalación');
      }
    } catch (error) {
      console.error('Error al mostrar el prompt de instalación:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setUserDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // No mostrar nada si ya está instalada, el usuario dismissió, no es instalable o no debe mostrarse
  if (isInstalled || userDismissed || !isInstallable || !showPrompt || isDesktop()) {
    return null;
  }

  // Modal para iOS con instrucciones
  if (isIOS()) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-w-md w-full animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FaApple className="text-white text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Instalar Sin Batallar</h3>
                  <p className="text-xs text-gray-500">App Web Progresiva</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900 font-medium mb-3">
                  Para instalar esta app en tu iPhone o iPad:
                </p>
                <ol className="space-y-3 text-sm text-blue-800">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p>Toca el botón de <strong>Compartir</strong></p>
                      <div className="flex items-center gap-2 mt-2 text-blue-600">
                        <FaShareAlt className="text-lg" />
                        <span className="text-xs">(en la barra inferior de Safari)</span>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p>Selecciona <strong>"Añadir a pantalla de inicio"</strong></p>
                      <div className="flex items-center gap-2 mt-2 text-blue-600">
                        <FaPlusSquare className="text-lg" />
                        <span className="text-xs">(desplázate hacia abajo si no lo ves)</span>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p>Toca <strong>"Añadir"</strong> en la esquina superior derecha</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs text-gray-700">
                  <span className="font-semibold">💡 Ventajas:</span> Acceso rápido desde tu pantalla de inicio, 
                  funciona sin conexión, y notificaciones en tiempo real.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={handleDismiss}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(100%);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
          .animate-slide-up {
            animation: slide-up 0.4s ease-out;
          }
        `}</style>
      </>
    );
  }

  // Modal para Android (con botón directo de instalación)
  if (isAndroid() || canPromptInstall) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-w-md w-full animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FaAndroid className="text-white text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Instalar Sin Batallar</h3>
                  <p className="text-xs text-gray-500">App Web Progresiva</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">🚀 Instala Sin Batallar</span> en tu dispositivo para:
                </p>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Acceso rápido desde tu pantalla de inicio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Funciona sin conexión a internet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Notificaciones en tiempo real</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Experiencia de app nativa</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="p-6 border-t border-gray-200 space-y-3">
              <button
                onClick={handleInstallAndroid}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <FaMobileAlt className="text-lg" />
                <span>Instalar Aplicación</span>
              </button>
              <button
                onClick={handleDismiss}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Más tarde
              </button>
            </div>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(100%);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
          .animate-slide-up {
            animation: slide-up 0.4s ease-out;
          }
        `}</style>
      </>
    );
  }

  return null;
}
