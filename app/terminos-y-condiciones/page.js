import LegalLayout from '@/components/ui/LegalLayout';
import LegalSection from '@/components/ui/LegalSection';
import { LEGAL_CONFIG, ultimaActualizacion } from '@/lib/legal-config';

export const metadata = {
  title: 'Términos y Condiciones - Sin Batallar',
  description: 'Condiciones de uso de la plataforma Sin Batallar para clientes, contratistas y demás usuarios.',
};

export default function TerminosYCondiciones() {
  return (
    <LegalLayout
      tituloPrefijo="Términos y"
      tituloDestacado="Condiciones"
      actualizado={ultimaActualizacion('terminos')}
      introduccion={
        <>
          Estos Términos y Condiciones regulan el uso de{' '}
          <span className="font-bold text-primary">Sin Batallar</span>, la plataforma que conecta a
          clientes con contratistas de servicios del hogar. Al registrarte o usar la plataforma,
          aceptas quedar obligado por estos términos. Si no estás de acuerdo, no debes usar el servicio.
        </>
      }
      otroDocumento="privacidad"
    >
      {/* 1 */}
      <LegalSection titulo="1. Aceptación de los términos">
        <p>
          El uso de Sin Batallar, ya sea como cliente, contratista o cualquier otro rol de la
          plataforma, implica la aceptación total de estos Términos y de nuestras{' '}
          <a href="/politicas-de-privacidad" className="text-primary underline underline-offset-2">
            Políticas de Privacidad
          </a>. Nuestros servicios están dirigidos a personas mayores de 18 años; al registrarte,
          declaras que cumples con este requisito.
        </p>
      </LegalSection>

      {/* 2 */}
      <LegalSection titulo="2. Descripción del servicio">
        <p>
          Sin Batallar es un <strong>marketplace</strong> que conecta a clientes que necesitan servicios
          del hogar con contratistas independientes que los ofrecen. No empleamos a los contratistas ni
          ejecutamos los trabajos: actuamos como intermediario tecnológico entre ambas partes. La
          calidad, el cumplimiento y la ejecución del servicio contratado son responsabilidad del
          contratista que lo realiza.
        </p>
      </LegalSection>

      {/* 3 */}
      <LegalSection titulo="3. Tipos de cuenta">
        <p>La plataforma opera con distintos roles, cada uno con sus propias obligaciones:</p>
        <ul>
          <li><strong>Cliente:</strong> solicita servicios y acepta cotizaciones.</li>
          <li><strong>Contratista:</strong> ofrece servicios, envía cotizaciones y los ejecuta.</li>
          <li><strong>Técnico:</strong> personal asociado a un contratista que atiende citas y elabora cotizaciones en su nombre.</li>
          <li><strong>Aperturador e incorporador:</strong> roles internos de la plataforma que participan en la gestión de zonas y en la incorporación de contratistas.</li>
          <li><strong>Ferretero:</strong> proveedor de materiales que publica su catálogo para contratistas cercanos.</li>
        </ul>
        <p className="mt-3">Cada rol solo puede usar las funciones correspondientes a su cuenta.</p>
      </LegalSection>

      {/* 4 */}
      <LegalSection titulo="4. Registro y cuenta">
        <p>
          Al registrarte, te comprometes a proporcionar información veraz, completa y actualizada.
          Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad que
          ocurra en tu cuenta. Debes notificarnos de inmediato ante cualquier uso no autorizado.
          Nos reservamos el derecho de suspender o cancelar cuentas que incumplan estos Términos o que
          proporcionen información falsa. Las cuentas de contratista y ferretero requieren revisión y
          activación previa por parte de nuestro equipo.
        </p>
      </LegalSection>

      {/* 5 */}
      <LegalSection titulo="5. Flujo del servicio: cita, cotización y aceptación">
        <p>El ciclo de un servicio en la plataforma funciona así:</p>
        <ul>
          <li>El cliente crea una <strong>cita</strong> (solicitud de servicio), inmediata o programada.</li>
          <li>Uno o varios contratistas —o los técnicos asociados a ellos— envían <strong>cotizaciones</strong> con el detalle de materiales, mano de obra y costo total.</li>
          <li>El cliente revisa las cotizaciones recibidas y <strong>acepta una de ellas</strong>.</li>
        </ul>
        <p className="mt-3">
          Una vez aceptada, la cotización se convierte en un acuerdo vinculante entre el cliente y el
          contratista, en los términos ahí descritos. Sin Batallar facilita este acuerdo pero no es
          parte de él.
        </p>
      </LegalSection>

      {/* 6 */}
      <LegalSection titulo="6. Precios, IVA y cotizaciones">
        <p>
          Toda cotización desglosa el costo de materiales y el costo de mano de obra, y el IVA
          correspondiente se calcula sobre el subtotal conforme a la legislación fiscal aplicable. Una
          vez que el cliente acepta una cotización, el monto total queda fijado salvo que ambas partes
          acuerden un cambio de alcance del trabajo, en cuyo caso corresponde generar una nueva cotización.
        </p>
      </LegalSection>

      {/* 7 */}
      <LegalSection titulo="7. Pagos">
        <p>
          El pago del servicio ocurre fuera de la aplicación. Se divide en dos partes, 50% de anticipo
          y 50% de saldo, pagadas por transferencia bancaria directamente al contratista, con
          comprobante enviado por WhatsApp.
        </p>
        <p className="mt-3">
          Dentro de la plataforma, el cliente solo declara que realizó el pago y el contratista verifica
          haberlo recibido. Sin Batallar no procesa, retiene ni custodia el dinero en ningún momento, y
          no es responsable de errores, retrasos o disputas sobre la transferencia bancaria en sí.
          Cualquier controversia sobre un pago se resuelve directamente entre cliente y contratista; la
          plataforma puede mediar como cortesía, pero no garantiza el resultado.
        </p>
      </LegalSection>

      {/* 8 */}
      <LegalSection titulo="8. Comisiones y distribución">
        <p>
          Sin Batallar cobra una comisión sobre la mano de obra de cada servicio completado; los
          materiales se reembolsan íntegramente al contratista. Cuando corresponde, parte de esa
          comisión se distribuye entre el aperturador y el incorporador involucrados en la zona o en la
          incorporación del contratista. Los porcentajes vigentes pueden ajustarse; el desglose de cada
          cotización siempre está disponible para las partes involucradas.
        </p>
      </LegalSection>

      {/* 9 */}
      <LegalSection titulo="9. Calificaciones y reseñas">
        <p>
          Al finalizar un servicio, cliente y contratista pueden calificarse mutuamente. Las
          calificaciones deben reflejar la experiencia real del servicio prestado; está prohibido
          publicar calificaciones falsas, difamatorias o motivadas por fines distintos a evaluar el
          servicio. Sin Batallar puede moderar o retirar calificaciones que incumplan esta regla.
        </p>
      </LegalSection>

      {/* 10 */}
      <LegalSection titulo="10. Obligaciones del contratista">
        <p>El contratista se compromete a:</p>
        <ul>
          <li>Contar con la capacitación, licencias o permisos que su actividad requiera.</li>
          <li>Ejecutar el servicio conforme a lo cotizado y aceptado por el cliente.</li>
          <li>Tratar al cliente y su propiedad con el debido cuidado y profesionalismo.</li>
          <li>Responder por la calidad y garantía del trabajo realizado: la garantía del servicio recae en el contratista, no en la plataforma.</li>
        </ul>
      </LegalSection>

      {/* 11 */}
      <LegalSection titulo="11. Conducta prohibida">
        <p>Está prohibido, entre otras conductas:</p>
        <ul>
          <li>Usar la plataforma para contactar a la contraparte y luego acordar el servicio o el pago completamente fuera de ella, evadiendo la comisión de la plataforma.</li>
          <li>Proporcionar información falsa sobre identidad, ubicación, servicios o calificaciones.</li>
          <li>Realizar un uso abusivo, fraudulento o que ponga en riesgo la seguridad de otros usuarios.</li>
          <li>Suplantar a otro usuario o utilizar la cuenta de un tercero sin autorización.</li>
        </ul>
        <p className="mt-3">
          El incumplimiento puede resultar en la suspensión o cancelación de la cuenta.
        </p>
      </LegalSection>

      {/* 12 */}
      <LegalSection titulo="12. Propiedad intelectual">
        <p>
          La marca, el logotipo y el contenido propio de Sin Batallar son propiedad de la plataforma y
          no pueden reproducirse sin autorización. Al subir fotos u otro contenido a la plataforma
          (por ejemplo, imágenes de una cita o de un trabajo realizado), otorgas a Sin Batallar una
          licencia no exclusiva para almacenar y mostrar ese contenido dentro de la plataforma, con el
          único fin de operar el servicio.
        </p>
      </LegalSection>

      {/* 13 */}
      <LegalSection titulo="13. Limitación de responsabilidad">
        <p>
          Como plataforma intermediaria que no participa en el flujo de pago, Sin Batallar no es
          responsable por la calidad del trabajo realizado, por daños derivados de la prestación del
          servicio, ni por pérdidas relacionadas con transferencias bancarias entre cliente y
          contratista. Tampoco garantiza la disponibilidad ininterrumpida de la plataforma. En la máxima
          medida permitida por la ley, la responsabilidad de Sin Batallar frente a cualquier usuario se
          limita al monto de las comisiones efectivamente cobradas por el servicio en disputa.
        </p>
      </LegalSection>

      {/* 14 */}
      <LegalSection titulo="14. Reclamaciones">
        <p>
          Si tienes una inconformidad sobre un servicio, puedes contactarnos en{' '}
          <span className="text-primary font-medium">{LEGAL_CONFIG.contacto.legal}</span> o a través de
          soporte dentro de la app. Sin Batallar puede mediar entre las partes, pero la resolución final
          de disputas sobre la ejecución del trabajo o el pago corresponde a cliente y contratista.
        </p>
      </LegalSection>

      {/* 15 */}
      <LegalSection titulo="15. Modificaciones de estos términos">
        <p>
          Podemos actualizar estos Términos periódicamente. Ante cambios significativos, lo notificaremos
          mediante un aviso visible en la plataforma o por correo electrónico. El uso continuado de
          Sin Batallar después de la notificación implica tu aceptación de los términos actualizados.
        </p>
      </LegalSection>

      {/* 16 */}
      <LegalSection titulo="16. Ley aplicable y jurisdicción">
        <p>
          Estos Términos se rigen por las leyes de {LEGAL_CONFIG.jurisdiccion.pais}.
          {LEGAL_CONFIG.jurisdiccion.plaza && (
            <>
              {' '}Para cualquier controversia, las partes se someten a los tribunales competentes de{' '}
              {LEGAL_CONFIG.jurisdiccion.plaza}, renunciando a cualquier otro fuero que pudiera corresponderles.
            </>
          )}
        </p>
        {!LEGAL_CONFIG.jurisdiccion.plaza && (
          <p className="text-amber-300 text-sm">
            [Pendiente: falta confirmar el estado o ciudad para fijar el fuero de tribunales competentes.]
          </p>
        )}
      </LegalSection>

      {/* 17 */}
      <LegalSection titulo="17. Contacto">
        <p>Para dudas sobre estos Términos y Condiciones, puedes contactarnos:</p>
        <ul>
          <li><strong>Correo:</strong> {LEGAL_CONFIG.contacto.legal}</li>
          <li><strong>Plataforma:</strong> a través de la sección de soporte dentro de la app.</li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
