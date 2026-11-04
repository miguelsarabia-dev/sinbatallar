'use client';
// Panel de pagos del cliente dentro de una cita ya aceptada:
//  - comprobante rechazado -> ve el motivo y vuelve a subirlo
//  - trabajo terminado -> confirma el trabajo y paga el saldo (si eligió anticipo)
import { useState, useEffect, useCallback } from 'react';
import { FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import SubirComprobante, { peso, ETIQUETA_TIPO } from './SubirComprobante';

const json = (metodo, cuerpo) => ({ method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

export default function PagoClienteCita({ cita, onChanged, showError, showSuccess }) {
    const cot = cita.cotizacionAceptada;
    const [comprobantes, setComprobantes] = useState([]);
    const [subiendo, setSubiendo] = useState(false);
    const [ocupado, setOcupado] = useState(false);

    const aplica = !!cot && ['verificando_pago', 'completada'].includes(cita.estado) && !cita.pagado;

    const cargar = useCallback(async () => {
        if (!cot?._id) return;
        try {
            const res = await fetch(`/api/comprobantes?cotizacionId=${cot._id}`);
            if (res.ok) setComprobantes(await res.json());
        } catch { /* sin comprobantes visibles */ }
    }, [cot?._id]);
    useEffect(() => { if (aplica) cargar(); }, [aplica, cargar, cita.estado]);

    if (!aplica) return null;

    const total = Number(cot.total) || 0;
    const esTotal = cot.modalidadPago === 'total';
    // Qué pago toca ahora
    let tipo = null;
    if (cita.estado === 'verificando_pago') tipo = esTotal ? 'total' : 'anticipo';
    else if (!esTotal && cot.anticipoVerificado) tipo = 'saldo';
    const parte = tipo === 'total' ? cot.pagoUnico : cot[tipo];
    const declarado = !!parte?.declarado;
    const verificado = !!parte?.verificado;
    const monto = tipo === 'total' ? total : Math.round(total * 50) / 100;
    const rechazado = comprobantes.find(c => c.tipo === tipo && c.estado === 'rechazado' && !declarado);

    const declarar = async (comprobante) => {
        try {
            const res = await fetch(`/api/cotizaciones/${cot._id}`, json('PATCH', { paymentInfo: { tipo, comprobanteDeclarado: true, via: 'comprobante' } }));
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || 'No se pudo declarar el pago');
            setSubiendo(false);
            showSuccess?.('Comprobante enviado. El contratista lo verificará.');
            await cargar();
            onChanged?.();
        } catch (e) { showError?.(e.message); }
    };

    const confirmarTrabajo = async () => {
        setOcupado(true);
        try {
            const res = await fetch(`/api/citas/${cita._id}/confirmar-cliente`, { method: 'PATCH' });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || 'No se pudo confirmar el trabajo');
            showSuccess?.('Trabajo confirmado');
            onChanged?.();
        } catch (e) { showError?.(e.message); } finally { setOcupado(false); }
    };

    const caja = 'rounded-lg border p-3 mt-3 space-y-3 text-sm';

    return (
        <div className={`${caja} border-amber-200 bg-amber-50`}>
            {/* Trabajo terminado: el cliente confirma */}
            {cita.estado === 'completada' && !cita.clienteConfirmo && (
                <div className="space-y-2">
                    <p className="flex items-center gap-2 font-semibold text-gray-900"><FaCheckCircle className="text-green-600" /> El técnico terminó el trabajo</p>
                    <p className="text-gray-700">Revisa que haya quedado bien y confírmalo{esTotal ? '' : ' para pagar el saldo'}.</p>
                    <button onClick={confirmarTrabajo} disabled={ocupado} className="w-full bg-green-600 text-white rounded-lg py-2 font-semibold disabled:opacity-50">
                        {ocupado ? 'Confirmando...' : 'Confirmar que quedó bien'}
                    </button>
                </div>
            )}

            {/* Pago pendiente de subir / rechazado */}
            {tipo && !declarado && !subiendo && (
                <div className="space-y-2">
                    {rechazado && (
                        <p className="flex items-start gap-2 text-red-700"><FaExclamationTriangle className="mt-0.5 flex-shrink-0" /> Tu comprobante fue rechazado: <strong>{rechazado.motivoRechazo}</strong></p>
                    )}
                    {(cita.estado === 'verificando_pago' || cita.clienteConfirmo) && (
                        <button onClick={() => setSubiendo(true)} className="w-full bg-primary text-white rounded-lg py-2 font-semibold">
                            {rechazado ? 'Volver a subir el comprobante' : `Pagar ${ETIQUETA_TIPO[tipo]} · ${peso(monto)}`}
                        </button>
                    )}
                </div>
            )}

            {tipo && !declarado && subiendo && (
                <SubirComprobante
                    cotizacionId={cot._id}
                    tipo={tipo}
                    monto={monto}
                    contratista={cita.contratista}
                    informacionPago={cita.contratista?.informacionPago || cot.contratista?.informacionPago}
                    onCancelar={() => setSubiendo(false)}
                    onSubido={declarar}
                />
            )}

            {/* Esperando al contratista */}
            {tipo && declarado && !verificado && (
                <p className="flex items-center gap-2 text-gray-800"><FaClock className="text-amber-600" /> Comprobante de {ETIQUETA_TIPO[tipo].toLowerCase()} enviado. Esperando que el contratista lo verifique.</p>
            )}
            {tipo && verificado && cita.estado === 'completada' && esTotal && (
                <p className="flex items-center gap-2 text-gray-800"><FaCheckCircle className="text-green-600" /> Pago total verificado. El servicio se cerrará al confirmar el trabajo.</p>
            )}
        </div>
    );
}
