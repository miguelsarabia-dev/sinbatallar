'use client';

import { useEffect } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaTools, FaCalendarAlt, FaRobot, FaArrowRight } from 'react-icons/fa';

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (session) {
      const userRole = session.user?.role || session.user?.userType;

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
          router.push('/main/servicios-programables');
          break;
        default:
          break;
      }
    }
  }, [session, status, router]);

  if (session) {
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
