'use client';
// Muestra los datos bancarios del contratista y sube el comprobante de la transferencia (POST /api/comprobantes).
import { useState } from 'react';
import { FaUniversity, FaUpload } from 'react-icons/fa';

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
export const peso = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;
export const ETIQUETA_TIPO = { anticipo: 'Anticipo (50%)', saldo: 'Saldo (50%)', total: 'Pago total (100%)' };

export default function SubirComprobante({ cotizacionId, tipo, monto, contratista, informacionPago, onSubido, onCancelar, textoBoton = 'Subir comprobante' }) {
    const [archivo, setArchivo] = useState(null);
    const [vista, setVista] = useState(null);
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);

    const banco = informacionPago || contratista?.informacionPago;
    const tieneBanco = banco && (banco.clabe || banco.numeroCuenta);

    const elegir = (e) => {
        const f = e.target.files?.[0];
        setError(null);
        if (!f) return;
        const tipoOk = f.type ? TIPOS.includes(f.type.toLowerCase()) : /\.(jpe?g|png|heic|heif)$/i.test(f.name);
        if (!tipoOk) return setError('Usa una imagen JPG, PNG o HEIC');
        if (f.size > MAX_BYTES) return setError('La imagen excede 5 MB');
        setArchivo(f);
        setVista(URL.createObjectURL(f));
    };

    const enviar = async () => {
        if (!archivo) return setError('Selecciona la imagen de tu comprobante');
        setEnviando(true); setError(null);
        try {
            const fd = new FormData();
            fd.append('cotizacionId', cotizacionId);
            fd.append('tipo', tipo);
            fd.append('monto', String(monto));
            fd.append('imagen', archivo);
            const res = await fetch('/api/comprobantes', { method: 'POST', body: fd });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || 'No se pudo subir el comprobante');
            await onSubido?.(data.comprobante);
        } catch (e) {
            setError(e.message);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <div className="flex items-center gap-2 font-semibold mb-2"><FaUniversity /> Transfiere {peso(monto)} ({ETIQUETA_TIPO[tipo]})</div>
                {tieneBanco ? (
                    <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                        {banco.nombreTitular && (<><dt className="text-blue-700">Titular</dt><dd className="font-medium">{banco.nombreTitular}</dd></>)}
                        {banco.banco && (<><dt className="text-blue-700">Banco</dt><dd className="font-medium">{banco.banco}</dd></>)}
                        {banco.clabe && (<><dt className="text-blue-700">CLABE</dt><dd className="font-mono font-medium select-all">{banco.clabe}</dd></>)}
                        {banco.numeroCuenta && (<><dt className="text-blue-700">Cuenta</dt><dd className="font-mono font-medium select-all">{banco.numeroCuenta}</dd></>)}
                    </dl>
                ) : (
                    <p>{contratista?.nombre || 'El contratista'} aún no registró sus datos bancarios. Contáctalo{contratista?.telefono ? ` al ${contratista.telefono}` : ''} para pedirlos.</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de tu comprobante</label>
                <input type="file" accept="image/jpeg,image/png,image/heic,image/heif" onChange={elegir} className="block w-full text-sm" />
                {vista && <img src={vista} alt="Vista previa del comprobante" className="mt-3 max-h-56 rounded-md border" />}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
                {onCancelar && <button type="button" onClick={onCancelar} disabled={enviando} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700">Cancelar</button>}
                <button type="button" onClick={enviar} disabled={enviando || !archivo}
                    className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                    <FaUpload /> {enviando ? 'Subiendo...' : textoBoton}
                </button>
            </div>
        </div>
    );
}
