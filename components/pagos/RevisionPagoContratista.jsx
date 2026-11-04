'use client';
// El contratista ve la imagen del comprobante y verifica o rechaza (con motivo) el pago declarado por el cliente.
import { useState, useEffect, useCallback } from 'react';
import { FaCheckCircle, FaTimesCircle, FaImage } from 'react-icons/fa';
import { peso, ETIQUETA_TIPO } from './SubirComprobante';

export default function RevisionPagoContratista({ cita, onChanged, showError, showSuccess }) {
    const cot = cita.cotizacionAceptada;
    const [comprobantes, setComprobantes] = useState([]);
    const [ocupado, setOcupado] = useState(null);

    const tipoPendiente = !cot ? null
        : cot.modalidadPago === 'total'
            ? (cot.pagoUnico?.declarado && !cot.pagoUnico?.verificado ? 'total' : null)
            : (cot.anticipo?.declarado && !cot.anticipo?.verificado ? 'anticipo'
                : cot.anticipo?.verificado && cot.saldo?.declarado && !cot.saldo?.verificado ? 'saldo' : null);

    const cargar = useCallback(async () => {
        if (!cot?._id) return;
        try {
            const res = await fetch(`/api/comprobantes?cotizacionId=${cot._id}`);
            if (res.ok) setComprobantes(await res.json());
        } catch { /* sin comprobantes */ }
    }, [cot?._id]);
    useEffect(() => { if (tipoPendiente) cargar(); }, [tipoPendiente, cargar]);

    if (!tipoPendiente) return null;
    const comprobante = comprobantes.find(c => c.tipo === tipoPendiente && c.estado === 'vigente');

    const resolver = async (verificado) => {
        let motivo;
        if (!verificado) {
            motivo = window.prompt('Motivo del rechazo (se le muestra al cliente). Ej.: el monto no coincide');
            if (!motivo?.trim()) return;
        }
        setOcupado(verificado ? 'ok' : 'no');
        try {
            const res = await fetch(`/api/cotizaciones/${cot._id}/verificar-pago`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: tipoPendiente, verificado, motivo })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || 'No se pudo registrar la verificación');
            showSuccess?.(verificado ? 'Pago verificado' : 'Comprobante rechazado');
            onChanged?.();
        } catch (e) { showError?.(e.message); } finally { setOcupado(null); }
    };

    return (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 mt-3 space-y-3 text-sm">
            <p className="font-semibold text-gray-900">Verifica el pago: {ETIQUETA_TIPO[tipoPendiente]} · {peso(comprobante?.monto)}</p>
            {comprobante ? (
                <a href={comprobante.imagenUrl} target="_blank" rel="noreferrer" className="block">
                    <img src={comprobante.imagenUrl} alt="Comprobante del cliente" className="max-h-64 rounded-md border bg-white" />
                    <span className="inline-flex items-center gap-1 text-primary underline mt-1"><FaImage /> Ver imagen completa</span>
                </a>
            ) : (
                <p className="text-gray-600">No hay imagen de comprobante (pago declarado antes del nuevo flujo). Verifica contra tu banco.</p>
            )}
            <p className="text-gray-700">Confirma en tu banco que recibiste el monto antes de verificar.</p>
            <div className="flex gap-2">
                <button onClick={() => resolver(true)} disabled={!!ocupado} className="flex-1 bg-green-600 text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                    <FaCheckCircle /> {ocupado === 'ok' ? 'Verificando...' : 'Verificar pago'}
                </button>
                <button onClick={() => resolver(false)} disabled={!!ocupado} className="flex-1 bg-red-600 text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                    <FaTimesCircle /> Rechazar
                </button>
            </div>
        </div>
    );
}
