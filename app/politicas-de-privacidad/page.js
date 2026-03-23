import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Políticas de Privacidad - Sin Batallar',
  description: 'Conoce cómo Sin Batallar recopila, usa y protege tu información personal.',
};

export default function PoliticasPrivacidad() {
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
              Políticas de <span className="text-primary">Privacidad</span>
            </h1>
            <p className="text-white/70 text-sm">Última actualización: febrero de 2026</p>
          </div>

          {/* Introducción */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <p className="text-white/90 leading-relaxed">
              En <span className="font-bold text-primary">Sin Batallar</span> nos comprometemos a proteger
              y respetar tu privacidad. Esta política explica cómo recopilamos, usamos, almacenamos y
              protegemos tu información personal cuando utilizas nuestra plataforma de servicios del hogar.
              Al usar nuestros servicios, aceptas las prácticas descritas en este documento.
            </p>
          </div>

          {/* Sección 1 */}
          <Section titulo="1. Información que recopilamos">
            <p>Recopilamos información que tú nos proporcionas directamente, como:</p>
            <ul>
              <li><strong>Datos de registro:</strong> nombre, correo electrónico, número de teléfono y contraseña.</li>
              <li><strong>Perfil:</strong> dirección, foto de perfil y preferencias de servicio.</li>
              <li><strong>Información de pago:</strong> datos necesarios para procesar transacciones (no almacenamos números de tarjeta completos).</li>
              <li><strong>Comunicaciones:</strong> mensajes enviados a través de la plataforma o al soporte.</li>
            </ul>
            <p className="mt-3">Adicionalmente, recopilamos información automáticamente al usar la plataforma:</p>
            <ul>
              <li>Dirección IP y datos del dispositivo o navegador.</li>
              <li>Datos de ubicación (con tu consentimiento) para conectarte con profesionales cercanos.</li>
              <li>Registros de actividad dentro de la aplicación.</li>
            </ul>
          </Section>

          {/* Sección 2 */}
          <Section titulo="2. Uso de la información">
            <p>Utilizamos tu información personal para:</p>
            <ul>
              <li>Crear y gestionar tu cuenta en la plataforma.</li>
              <li>Conectarte con contratistas y profesionales del hogar.</li>
              <li>Procesar pagos y emitir comprobantes de servicio.</li>
              <li>Enviarte notificaciones relacionadas con tus citas y solicitudes.</li>
              <li>Mejorar nuestros servicios mediante análisis de uso.</li>
              <li>Prevenir fraudes y garantizar la seguridad de la plataforma.</li>
              <li>Cumplir con obligaciones legales y reglamentarias.</li>
            </ul>
          </Section>

          {/* Sección 3 */}
          <Section titulo="3. Compartición de información">
            <p>
              No vendemos ni alquilamos tu información personal a terceros. Podemos compartirla en los
              siguientes casos:
            </p>
            <ul>
              <li><strong>Contratistas:</strong> compartimos la información necesaria (nombre, dirección del servicio, detalles del trabajo) para que puedan brindar la asistencia solicitada.</li>
              <li><strong>Proveedores de servicios:</strong> empresas que nos asisten en operaciones como pagos, almacenamiento en la nube o envío de correos electrónicos, bajo acuerdos de confidencialidad.</li>
              <li><strong>Obligaciones legales:</strong> cuando sea requerido por ley, orden judicial o autoridad competente.</li>
            </ul>
          </Section>

          {/* Sección 4 */}
          <Section titulo="4. Seguridad de los datos">
            <p>
              Implementamos medidas técnicas y organizativas para proteger tu información contra accesos
              no autorizados, pérdida o divulgación. Entre ellas:
            </p>
            <ul>
              <li>Cifrado de contraseñas con algoritmos de hashing seguros.</li>
              <li>Comunicaciones cifradas mediante HTTPS/TLS.</li>
              <li>Control de acceso basado en roles dentro de la plataforma.</li>
              <li>Revisiones periódicas de seguridad.</li>
            </ul>
            <p className="mt-3">
              Sin embargo, ningún sistema es completamente infalible. Te recomendamos usar contraseñas
              seguras y no compartir tus credenciales.
            </p>
          </Section>

          {/* Sección 5 */}
          <Section titulo="5. Retención de datos">
            <p>
              Conservamos tu información personal mientras mantengas una cuenta activa en Sin Batallar o
              mientras sea necesario para prestarte servicios. Si deseas eliminar tu cuenta, puedes
              solicitarlo contactándonos y eliminaremos tus datos personales conforme a la legislación
              aplicable.
            </p>
          </Section>

          {/* Sección 6 */}
          <Section titulo="6. Tus derechos">
            <p>Tienes derecho a:</p>
            <ul>
              <li><strong>Acceso:</strong> solicitar una copia de la información personal que tenemos sobre ti.</li>
              <li><strong>Rectificación:</strong> corregir datos incorrectos o desactualizados.</li>
              <li><strong>Eliminación:</strong> solicitar la supresión de tus datos personales.</li>
              <li><strong>Oposición:</strong> oponerte al procesamiento de tus datos en determinadas circunstancias.</li>
              <li><strong>Portabilidad:</strong> recibir tus datos en un formato estructurado y legible.</li>
            </ul>
            <p className="mt-3">
              Para ejercer cualquiera de estos derechos, contáctanos en{' '}
              <span className="text-primary font-medium">privacidad@sinbatallar.com</span>.
            </p>
          </Section>

          {/* Sección 7 */}
          <Section titulo="7. Cookies y tecnologías similares">
            <p>
              Utilizamos cookies y tecnologías similares para mejorar tu experiencia, recordar tus
              preferencias y analizar el uso de la plataforma. Puedes controlar el uso de cookies
              desde la configuración de tu navegador, aunque algunas funciones pueden verse afectadas
              si las deshabilitas.
            </p>
          </Section>

          {/* Sección 8 */}
          <Section titulo="8. Menores de edad">
            <p>
              Nuestros servicios están dirigidos a personas mayores de 18 años. No recopilamos
              conscientemente información de menores de edad. Si detectamos que un menor ha creado una
              cuenta, eliminaremos su información de forma inmediata.
            </p>
          </Section>

          {/* Sección 9 */}
          <Section titulo="9. Cambios a esta política">
            <p>
              Podemos actualizar estas políticas periódicamente. Te notificaremos mediante un aviso
              visible en la plataforma o por correo electrónico ante cambios significativos. El uso
              continuado de Sin Batallar tras la notificación implica tu aceptación de los cambios.
            </p>
          </Section>

          {/* Sección 10 */}
          <Section titulo="10. Contacto">
            <p>
              Si tienes preguntas, inquietudes o solicitudes relacionadas con esta política de privacidad,
              puedes contactarnos:
            </p>
            <ul>
              <li><strong>Correo:</strong> privacidad@sinbatallar.com</li>
              <li><strong>Plataforma:</strong> a través de la sección de soporte dentro de la app.</li>
            </ul>
          </Section>

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
      <footer className="w-full px-4 py-6 text-center text-white/70 text-sm">
        <p>© 2025 Sin Batallar. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

function Section({ titulo, children }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-3">
      <h2 className="text-lg md:text-xl font-bold text-primary">{titulo}</h2>
      <div className="text-white/85 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-white">
        {children}
      </div>
    </div>
  );
}
