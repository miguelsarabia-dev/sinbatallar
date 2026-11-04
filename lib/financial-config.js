// lib/financial-config.js
// Única fuente de verdad del reparto. Los valores de abajo son los DEFAULTS; el admin
// puede sobrescribirlos (colección `configuraciones`, clave 'financiera') y el código
// de servidor los lee con getFinancialConfig() en lib/comisiones.js.
// Este archivo es puro (sin BD) para poder importarlo también desde componentes.

export const FINANCIAL_CONFIG = {
    // Porcentajes de distribución (sobre la Mano de Obra solamente)
    // Los materiales siempre se reembolsan al 100% al contratista
    DISTRIBUTION: {
        PLATFORM_BASE: 20,  // Parte de la plataforma sobre mano de obra (aperturador/incorporador se restan de aquí)
        OPENER: 2,          // Porcentaje para Aperturadores (sobre mano de obra)
        INCORPORATOR: 3,    // Porcentaje para Incorporadores (sobre mano de obra)
        CONTRACTOR: 80      // Porcentaje para Contratistas (sobre mano de obra)
    },

    // Impuestos (Adicional al Subtotal). El IVA no se reparte.
    TAX: {
        VAT_RATE: 0.16      // 16% IVA
    }
};

const pct = (n) => Math.min(100, Math.max(0, Number(n) || 0));

/**
 * Valida/normaliza una configuración de DISTRIBUTION. Lanza Error si es inconsistente.
 */
export function normalizarDistribucion(dist = {}) {
    const base = FINANCIAL_CONFIG.DISTRIBUTION;
    const out = {
        PLATFORM_BASE: pct(dist.PLATFORM_BASE ?? base.PLATFORM_BASE),
        OPENER: pct(dist.OPENER ?? base.OPENER),
        INCORPORATOR: pct(dist.INCORPORATOR ?? base.INCORPORATOR),
        CONTRACTOR: pct(dist.CONTRACTOR ?? base.CONTRACTOR)
    };
    if (out.PLATFORM_BASE + out.CONTRACTOR !== 100) {
        throw new Error('PLATFORM_BASE + CONTRACTOR debe sumar 100');
    }
    if (out.OPENER + out.INCORPORATOR > out.PLATFORM_BASE) {
        throw new Error('OPENER + INCORPORATOR no puede exceder PLATFORM_BASE');
    }
    return out;
}

/**
 * Reparto de un servicio. Los porcentajes se aplican SOLO sobre la mano de obra;
 * los materiales se reembolsan 100% al contratista; el IVA no se reparte.
 *
 *   contratista (bruto) = CONTRACTOR% de la mano de obra
 *   aperturador / incorporador = su % (solo si existen), restados de la plataforma
 *   plataforma = lo que reste de la mano de obra (evita descuadres por redondeo)
 *   técnico = porcentajeTecnico% de la mano de obra del contratista (se resta al contratista)
 *
 * @param {Object} p
 * @param {number} p.manoDeObra
 * @param {number} [p.costoMateriales]
 * @param {boolean} [p.hasOpener]
 * @param {boolean} [p.hasIncorporator]
 * @param {number} [p.porcentajeTecnico] 0-100
 * @param {Object} [p.config] DISTRIBUTION (default: FINANCIAL_CONFIG.DISTRIBUTION)
 */
export const calcularDistribucion = ({
    manoDeObra = 0,
    costoMateriales = 0,
    hasOpener = false,
    hasIncorporator = false,
    porcentajeTecnico = 0,
    config = FINANCIAL_CONFIG.DISTRIBUTION
}) => {
    const mo = Math.max(0, Number(manoDeObra) || 0);
    const materiales = Math.max(0, Number(costoMateriales) || 0);
    const { PLATFORM_BASE, OPENER, INCORPORATOR, CONTRACTOR } = config;
    const pTec = pct(porcentajeTecnico);

    const pOpener = hasOpener ? OPENER : 0;
    const pIncorporator = hasIncorporator ? INCORPORATOR : 0;
    const pPlatform = Math.max(0, PLATFORM_BASE - pOpener - pIncorporator);

    const montoOpener = Math.round((mo * pOpener) / 100);
    const montoIncorporator = Math.round((mo * pIncorporator) / 100);
    const contratistaBruto = Math.round((mo * CONTRACTOR) / 100);
    const montoPlatform = Math.max(0, mo - contratistaBruto - montoOpener - montoIncorporator);

    const montoTecnico = Math.round((contratistaBruto * pTec) / 100);
    const contratistaMO = contratistaBruto - montoTecnico;

    return {
        plataforma: { porcentaje: pPlatform, monto: montoPlatform },
        aperturador: { porcentaje: pOpener, monto: montoOpener },
        incorporador: { porcentaje: pIncorporator, monto: montoIncorporator },
        tecnico: { porcentaje: pTec, monto: montoTecnico },
        contratista: {
            porcentaje: CONTRACTOR,
            montoManoDeObraBruto: contratistaBruto,
            montoManoDeObra: contratistaMO,
            montoMateriales: materiales,
            montoTotal: contratistaMO + materiales
        }
    };
};
