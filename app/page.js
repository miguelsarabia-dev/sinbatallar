'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaTools, FaCalendarAlt, FaRobot, FaMobileAlt, FaArrowRight } from 'react-icons/fa';
import useSessionPersistence from '../hooks/useSessionPersistence';

export default function LandingPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const router = useRouter();

  // Hooks de sesión
  const { data: session, status } = useSession();
  const {
    session: persistentSession,
    isLoading: isPersistenceLoading,
    isAuthenticated
  } = useSessionPersistence();

  // Efecto para redirigir si ya hay sesión activa
  useEffect(() => {
    // Si está cargando, esperar
    if (status === 'loading' || isPersistenceLoading) return;

    // Si hay sesión activa (NextAuth o persistente), redirigir al dashboard correspondiente
    if (session || persistentSession || isAuthenticated) {
      const userSession = session || persistentSession;
      const userRole = userSession?.user?.role || userSession?.user?.userType;

      console.log('[Landing] Sesión detectada, redirigiendo...', { userRole, hasSession: !!session, hasPersistent: !!persistentSession });

      // Redirigir según el rol del usuario
      switch (userRole) {
        case 'admin':
          router.push('/admin');
          break;
        case 'contratista':
          router.push('/contratista/dashboard');
          break;
        case 'aperturador':
          router.push('/aperturador');
          break;
        case 'incorporador':
          router.push('/incorporador');
          break;
        case 'cliente':
        case 'user':
        default:
          router.push('/main/servicios-programables');
          break;
      }
      return;
    }
  }, [session, persistentSession, isAuthenticated, status, isPersistenceLoading, router]);

  // Efecto para manejar instalación PWA
  useEffect(() => {
    // Solo configurar PWA si no hay sesión activa (para evitar conflictos)
    if (session || persistentSession || isAuthenticated) return;

    // Detectar si la app ya está instalada
    const isInStandaloneMode = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
      );
    };

    if (isInStandaloneMode()) {
      setShowInstallButton(false);
      return;
    }

    // Capturar el evento beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      console.log('beforeinstallprompt event capturado');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listener para cuando se instale la app
    window.addEventListener('appinstalled', () => {
      console.log('PWA instalada con éxito');
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [session, persistentSession, isAuthenticated]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`Usuario eligió: ${outcome}`);

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  // Mostrar loading mientras se verifica la sesión
  if (status === 'loading' || isPersistenceLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary-light to-accent flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-medium">Cargando Sin Batallar...</p>
          <p className="text-sm text-white/70 mt-2">Verificando sesión</p>
        </div>
      </div>
    );
  }

  // Si hay sesión activa, no mostrar el landing (la redirección está en proceso)
  if (session || persistentSession || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary-light to-accent flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-medium">Redirigiendo...</p>
          <p className="text-sm text-white/70 mt-2">Accediendo a tu cuenta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary-light to-accent flex flex-col">
      {/* Header */}
      <header className="w-full px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Image
            src="/images/sinbatallarmini.png"
            alt="Sin Batallar Logo"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <Link
          href="/login"
          className="text-white hover:text-primary transition-colors text-sm md:text-base font-medium"
        >
          Iniciar Sesión
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12">
        <div className="max-w-4xl w-full mx-auto text-center space-y-8 md:space-y-12">

          {/* Logo Principal */}
          <div className="flex justify-center animate-fade-in">
            <Image
              src="/images/sinbatallartext.png"
              alt="Sin Batallar"
              width={350}
              height={120}
              className="w-full max-w-xs md:max-w-md object-contain drop-shadow-2xl"
              priority
            />
          </div>

          {/* Título Principal */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Servicios del hogar
              <span className="block text-primary">sin complicaciones</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Encuentra profesionales certificados para el mantenimiento y reparación de tu hogar
            </p>
          </div>

          {/* Badge PWA */}
          <div className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 inline-flex items-center gap-2">
              <FaMobileAlt className="text-primary text-xl" />
              <p className="text-white text-sm md:text-base font-medium">
                Ya puedes instalar <span className="font-bold">Sin Batallar</span> en tu dispositivo móvil
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
            <Link
              href="/register/UserRegister"
              className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-secondary font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg"
            >
              Registrarse
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto bg-secondary-light hover:bg-secondary text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg border-2 border-white/30"
            >
              Iniciar Sesión
            </Link>

            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto bg-white hover:bg-neutral-light text-secondary font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg flex items-center justify-center gap-2"
              >
                <FaMobileAlt className="text-xl" />
                Instalar App
              </button>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all">
              <FaTools className="text-primary text-5xl mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">Servicios Express</h3>
              <p className="text-white/80 text-sm">
                Atención inmediata para emergencias del hogar
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all">
              <FaCalendarAlt className="text-primary text-5xl mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">Servicios Programables</h3>
              <p className="text-white/80 text-sm">
                Agenda con anticipación y planifica tu día
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all">
              <FaRobot className="text-primary text-5xl mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">Asistente IA</h3>
              <p className="text-white/80 text-sm">
                Chat inteligente para resolver tus dudas
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-4 py-6 text-center text-white/70 text-sm space-y-2">
        <p>© 2025 Sin Batallar. Todos los derechos reservados.</p>
        <p>
          <Link href="/politicas-de-privacidad" className="hover:text-primary transition-colors underline underline-offset-2">
            Políticas de Privacidad
          </Link>
        </p>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </div>
  );
}
