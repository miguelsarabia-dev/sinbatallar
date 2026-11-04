// components/ui/PaymentModal.jsx
// Pago real al aceptar una cotización: el cliente elige anticipo 50% o pago total 100%, ve los datos
// bancarios del contratista, transfiere fuera de la app y SUBE la imagen del comprobante.
// Al terminar llama onPaymentSuccess({ tipo, modalidadPago, monto }); el padre acepta la cotización.
'use client';

import { useState, useEffect } from 'react';
import SubirComprobante, { peso } from '../pagos/SubirComprobante';

export default function PaymentModal({ isOpen, onClose, cotizacion, onPaymentSuccess }) {
  const [modalidad, setModalidad] = useState('anticipo');
  const [informacionPago, setInformacionPago] = useState(null);

  useEffect(() => {
    if (!isOpen || !cotizacion) return;
    setModalidad('anticipo');
    setInformacionPago(cotizacion.contratista?.informacionPago || null);
    // Si la cotización no trae los datos bancarios, se piden aparte
    const contratistaId = cotizacion.contratista?._id;
    if (!cotizacion.contratista?.informacionPago && contratistaId) {
      fetch(`/api/contratistas/${contratistaId}/pago`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => d?.informacionPago && setInformacionPago(d.informacionPago))
        .catch(() => {});
    }
  }, [isOpen, cotizacion]);

  if (!isOpen || !cotizacion) return null;

  const total = Number(cotizacion.total) || 0;
  const monto = modalidad === 'total' ? total : Math.round(total * 50) / 100;

  const opcion = (valor, titulo, detalle) => (
    <button
      type="button"
      onClick={() => setModalidad(valor)}
      className={`flex-1 text-left rounded-lg border-2 p-3 transition-colors ${modalidad === valor ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
    >
      <p className="font-semibold text-gray-900">{titulo}</p>
      <p className="text-sm text-gray-600">{detalle}</p>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Aceptar y pagar</h3>
            <p className="text-sm text-gray-600">{cotizacion.servicio?.nombre} · Total {peso(total)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">×</button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {opcion('anticipo', `Anticipo ${peso(Math.round(total * 50) / 100)}`, 'El otro 50% lo pagas al terminar, cuando confirmes el trabajo')}
          {opcion('total', `Pago total ${peso(total)}`, 'Liquidas todo ahora, sin saldo pendiente')}
        </div>

        <SubirComprobante
          key={modalidad}
          cotizacionId={cotizacion._id}
          tipo={modalidad === 'total' ? 'total' : 'anticipo'}
          monto={monto}
          contratista={cotizacion.contratista}
          informacionPago={informacionPago}
          textoBoton="Subir comprobante y aceptar"
          onCancelar={onClose}
          onSubido={() => onPaymentSuccess({ tipo: modalidad === 'total' ? 'total' : 'anticipo', modalidadPago: modalidad, monto })}
        />
      </div>
    </div>
  );
}
