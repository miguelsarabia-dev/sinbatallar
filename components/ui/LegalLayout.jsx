// components/ui/LegalLayout.jsx
// Layout compartido por las páginas legales públicas (Privacidad, Términos).
// Extraído de app/politicas-de-privacidad/page.js para que ambas páginas sean
// visualmente idénticas por construcción, en vez de mantener dos copias del
// mismo header/gradiente/footer que puedan desincronizarse con el tiempo.
import Link from 'next/link';
import Image from 'next/image';
import { LEGAL_CONFIG } from '@/lib/legal-config';

/**
 * @param {Object} props
 * @param {string} props.tituloPrefijo - Texto normal antes de la palabra resaltada, p. ej. "Políticas de".
 * @param {string} props.tituloDestacado - Palabra resaltada en color primary, p. ej. "Privacidad".
 * @param {string} props.actualizado - Texto de "Última actualización" (ver ultimaActualizacion() en lib/legal-config).
 * @param {string} props.introduccion - Párrafo introductorio dentro de la tarjeta bajo el título.
 * @param {'privacidad'|'terminos'} [props.otroDocumento] - Si se indica, agrega un enlace cruzado al otro documento legal en el footer.
 * @param {React.ReactNode} props.children - Las <LegalSection> del documento.
 */
export default function LegalLayout({
  tituloPrefijo,
  tituloDestacado,
  actualizado,
  introduccion,
  otroDocumento,
  children,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary-light to-accent flex flex-col">
      {/* Header */}
      <header className="w-full px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/sinbatallarmini.png"
            alt="Sin Batallar Logo"
            width={40}
            height={40}
            className="object-contain"
          />
        </Link>
        <Link
          href="/login"
          className="text-white hover:text-primary transition-colors text-sm md:text-base font-medium"
        >
          Iniciar Sesión
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="max-w-3xl w-full mx-auto space-y-6">

          {/* Título */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              {tituloPrefijo} <span className="text-primary">{tituloDestacado}</span>
            </h1>
            <p className="text-white/70 text-sm">{actualizado}</p>
          </div>

          {/* Introducción */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <p className="text-white/90 leading-relaxed">{introduccion}</p>
          </div>

          {children}

          {/* Botón de regreso */}
          <div className="text-center pt-4 pb-2">
            <Link
              href="/"
              className="inline-block bg-primary hover:bg-primary-hover text-secondary font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Volver al inicio
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-4 py-6 text-center text-white/70 text-sm space-y-2">
        <p>© {LEGAL_CONFIG.copyrightYear} Sin Batallar. Todos los derechos reservados.</p>
        {otroDocumento && (
          <p>
            <Link
              href={otroDocumento === 'privacidad' ? '/politicas-de-privacidad' : '/terminos-y-condiciones'}
              className="hover:text-primary transition-colors underline underline-offset-2"
            >
              {otroDocumento === 'privacidad' ? 'Políticas de Privacidad' : 'Términos y Condiciones'}
            </Link>
          </p>
        )}
      </footer>
    </div>
  );
}
