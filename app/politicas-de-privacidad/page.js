import LegalLayout from '@/components/ui/LegalLayout';
import LegalSection from '@/components/ui/LegalSection';
import { LEGAL_CONFIG, ultimaActualizacion } from '@/lib/legal-config';

export const metadata = {
  title: 'Políticas de Privacidad - Sin Batallar',
  description: 'Conoce cómo Sin Batallar recopila, usa y protege tu información personal.',
};

export default function PoliticasPrivacidad() {
  return (
    <LegalLayout
      tituloPrefijo="Políticas de"
      tituloDestacado="Privacidad"
      actualizado={ultimaActualizacion('privacidad')}
      introduccion={
        <>
          En <span className="font-bold text-primary">Sin Batallar</span> nos comprometemos a proteger
          y respetar tu privacidad. Esta política explica cómo recopilamos, usamos, almacenamos y
          protegemos tu información personal cuando utilizas nuestra plataforma de servicios del hogar.
          Al usar nuestros servicios, aceptas las prácticas descritas en este documento.
        </>
      }
      otroDocumento="terminos"
    >
      {/* Sección 1 */}
      <LegalSection titulo="1. Información que recopilamos">
        <p>Recopilamos información que tú nos proporcionas directamente, como:</p>
        <ul>
          <li><strong>Datos de registro:</strong> nombre, correo electrónico, número de teléfono y contraseña.</li>
          <li><strong>Perfil:</strong> dirección, foto de perfil y preferencias de servicio.</li>
          <li><strong>Comunicaciones:</strong> mensajes enviados a través de la plataforma o al soporte.</li>
        </ul>
        <p className="mt-3">
          <strong>Sobre el pago de servicios:</strong> Sin Batallar no procesa ni almacena datos de
          tarjetas ni información bancaria. El pago se realiza por transferencia directa entre el
          cliente y el contratista, fuera de la aplicación, y el comprobante se envía por WhatsApp.
          Dentro de la app solo registramos que el cliente declaró haber pagado y que el contratista
          verificó el pago, nunca el dato bancario en sí.
        </p>
        <p className="mt-3">Adicionalmente, recopilamos información automáticamente al usar la plataforma:</p>
        <ul>
          <li>Dirección IP y datos del dispositivo o navegador.</li>
          <li>Datos de ubicación (con tu consentimiento) para conectarte con profesionales cercanos.</li>
          <li>Registros de actividad dentro de la aplicación.</li>
        </ul>
      </LegalSection>

      {/* Sección 2 */}
      <LegalSection titulo="2. Uso de la información">
        <p>Utilizamos tu información personal para:</p>
        <ul>
          <li>Crear y gestionar tu cuenta en la plataforma.</li>
          <li>Conectarte con contratistas y profesionales del hogar.</li>
          <li>Registrar las declaraciones y verificaciones de pago de tus citas (el cobro en sí ocurre fuera de la app).</li>
          <li>Enviarte notificaciones relacionadas con tus citas y solicitudes.</li>
          <li>Operar el asistente de chat con inteligencia artificial cuando decides usarlo.</li>
          <li>Mejorar nuestros servicios mediante análisis de uso.</li>
          <li>Prevenir fraudes y garantizar la seguridad de la plataforma.</li>
          <li>Cumplir con obligaciones legales y reglamentarias.</li>
        </ul>
      </LegalSection>

      {/* Sección 3 */}
      <LegalSection titulo="3. Compartición de información">
        <p>
          No vendemos ni alquilamos tu información personal a terceros. Podemos compartirla en los
          siguientes casos:
        </p>
        <ul>
          <li><strong>Contratistas:</strong> compartimos la información necesaria (nombre, dirección del servicio, detalles del trabajo) para que puedan brindar la asistencia solicitada.</li>
          <li><strong>Proveedores de servicios que usamos para operar la plataforma:</strong> Cloudinary (almacenamiento de fotos de perfil, de citas y de cotizaciones), Google (inicio de sesión con Google) y nuestro proveedor de correo saliente, bajo acuerdos de confidencialidad.</li>
          <li><strong>Asistente de chat con IA:</strong> si usas el chat de soporte, el texto que escribes se envía a Groq, nuestro proveedor de inferencia de IA, únicamente para generar la respuesta.</li>
          <li><strong>Obligaciones legales:</strong> cuando sea requerido por ley, orden judicial o autoridad competente.</li>
        </ul>
      </LegalSection>

      {/* Sección 4 */}
      <LegalSection titulo="4. Seguridad de los datos">
        <p>
          Implementamos medidas técnicas para proteger tu información contra accesos no autorizados,
          pérdida o divulgación. Entre ellas:
        </p>
        <ul>
          <li>Cifrado de contraseñas con algoritmos de hashing seguros (nunca almacenamos tu contraseña en texto plano).</li>
          <li>Control de acceso por rol para las páginas de la plataforma (cliente, contratista, administrador y demás roles solo pueden ver sus propias secciones).</li>
        </ul>
        <p className="mt-3">
          Ningún sistema es completamente infalible y seguimos reforzando estas medidas de forma continua.
          Te recomendamos usar contraseñas seguras y no compartir tus credenciales con nadie.
        </p>
      </LegalSection>

      {/* Sección 5 */}
      <LegalSection titulo="5. Retención de datos">
        <p>
          Conservamos tu información personal mientras mantengas una cuenta activa en Sin Batallar o
          mientras sea necesario para prestarte servicios. Si deseas eliminar tu cuenta, puedes
          solicitarlo contactándonos y eliminaremos tus datos personales conforme a la legislación
          aplicable. Al día de hoy, esta solicitud se atiende de forma manual por correo electrónico,
          no de forma automática dentro de la app.
        </p>
      </LegalSection>

      {/* Sección 6 */}
      <LegalSection titulo="6. Tus derechos ARCO">
        <p>
          De acuerdo con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares
          (LFPDPPP), tienes derecho a:
        </p>
        <ul>
          <li><strong>Acceso:</strong> solicitar una copia de la información personal que tenemos sobre ti.</li>
          <li><strong>Rectificación:</strong> corregir datos incorrectos o desactualizados.</li>
          <li><strong>Cancelación:</strong> solicitar la eliminación de tus datos personales de nuestros registros cuando ya no sean necesarios.</li>
          <li><strong>Oposición:</strong> oponerte al uso de tus datos para fines específicos.</li>
        </ul>
        <p className="mt-3">
          Para ejercer cualquiera de estos derechos ARCO, contáctanos en{' '}
          <span className="text-primary font-medium">{LEGAL_CONFIG.contacto.privacidad}</span>. Responderemos
          tu solicitud en un plazo razonable conforme a la ley aplicable.
        </p>
      </LegalSection>

      {/* Sección 7 */}
      <LegalSection titulo="7. Cookies y tecnologías similares">
        <p>
          Utilizamos cookies y almacenamiento local del navegador para mantener tu sesión iniciada,
          recordar tus preferencias y analizar el uso de la plataforma. Puedes controlar el uso de
          cookies desde la configuración de tu navegador, aunque algunas funciones —como mantener la
          sesión iniciada— pueden verse afectadas si las deshabilitas.
        </p>
      </LegalSection>

      {/* Sección 8 */}
      <LegalSection titulo="8. Menores de edad">
        <p>
          Nuestros servicios están dirigidos a personas mayores de 18 años. No recopilamos
          conscientemente información de menores de edad. Si detectamos que un menor ha creado una
          cuenta, eliminaremos su información de forma inmediata.
        </p>
      </LegalSection>

      {/* Sección 9 */}
      <LegalSection titulo="9. Cambios a esta política">
        <p>
          Podemos actualizar estas políticas periódicamente. Te notificaremos mediante un aviso
          visible en la plataforma o por correo electrónico ante cambios significativos. El uso
          continuado de Sin Batallar tras la notificación implica tu aceptación de los cambios.
        </p>
      </LegalSection>

      {/* Sección 10 */}
      <LegalSection titulo="10. Contacto">
        <p>
          Si tienes preguntas, inquietudes o solicitudes relacionadas con esta política de privacidad,
          puedes contactarnos:
        </p>
        <ul>
          <li><strong>Correo:</strong> {LEGAL_CONFIG.contacto.privacidad}</li>
          <li><strong>Plataforma:</strong> a través de la sección de soporte dentro de la app.</li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
