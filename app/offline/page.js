'use client';

import { FaWifi, FaHome, FaRedo, FaInfoCircle } from 'react-icons/fa';
import { MdSignalWifiOff } from 'react-icons/md';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center text-white">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <MdSignalWifiOff className="text-3xl text-white" />
            </div>
            <h1 className="text-xl font-bold mb-2">Sin conexión a internet</h1>
            <p className="text-sm opacity-90">
              Se requiere una conexión activa para continuar
            </p>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-6">
            
            {/* Estado actual */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <MdSignalWifiOff className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Modo offline</h3>
                  <p className="text-xs text-gray-600">Algunas funciones no están disponibles</p>
                </div>
              </div>
            </div>

            {/* Funciones disponibles offline */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <FaInfoCircle className="text-blue-600 text-lg mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 text-sm mb-2">
                    Funciones disponibles sin internet:
                  </h3>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Ver citas e información guardada</li>
                    <li>• Revisar historial de servicios</li>
                    <li>• Consultar datos en caché</li>
                    <li>• Preparar solicitudes (se enviarán al reconectar)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
              >
                <FaRedo className="text-lg" />
                <span>Verificar conexión</span>
              </button>

              <Link
                href="/"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <FaHome className="text-lg" />
                <span>Ir al inicio</span>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-sm"></div>
              <span className="font-medium">Sin Batallar • Modo Offline</span>
            </div>
          </div>
        </div>

        {/* Tips adicionales */}
        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FaWifi className="text-blue-600" />
            Soluciones para reconectar:
          </h3>
          <ul className="text-xs text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
              <span>Verifica que el modo avión esté desactivado</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
              <span>Intenta cambiar entre Wi-Fi y datos móviles</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
              <span>Acércate a una zona con mejor cobertura</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
              <span>Reinicia tu router si usas Wi-Fi</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
