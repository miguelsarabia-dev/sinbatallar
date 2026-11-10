// lib/financial-config.js
// Única fuente de verdad del reparto. Los valores de abajo son los DEFAULTS; el admin
// puede sobrescribirlos (colección `configuraciones`, clave 'financiera') y el código
// de servidor los lee con getFinancialConfig() en lib/comisiones.js.
// Este archivo es puro (sin BD) para poder importarlo también desde componentes.

export const FINANCIAL_CONFIG = {
    // Porcentajes de distribución (sobre la Mano de Obra solamente)
    // Los materiales siempre se reembolsan al 100% al contratista.
    // Reparto vigente: Contratista 80% · Técnico 5% · Aperturador 3% · Sin Batallar 6%.
    // CONTRACTOR es la parte BRUTA del contratista (85 = 80 neto + 5 del técnico); el técnico se descuenta de ahí
    // y solo si la cita tiene técnico (si no, el contratista conserva los 85). El incorporador NO cobra por ahora (0).
    // Lo que no se asigna a nadie (hoy 6 puntos, más el % del aperturador si la zona no tiene) NO se le da a la
    // plataforma: queda registrado como `sinAsignar` hasta que se decida su destino.
    DISTRIBUTION: {
        PLATFORM: 6,        // Sin Batallar (empresa), sobre mano de obra
        OPENER: 3,          // Aperturadores (sobre mano de obra)
        INCORPORATOR: 0,    // Incorporadores (sobre mano de obra); 0 = no cobra
        CONTRACTOR: 85,     // Contratista BRUTO (incluye al técnico)
        TECHNICIAN: 5       // Técnico: fijo para todos, sale de la parte del contratista
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
        PLATFORM: pct(dist.PLATFORM ?? base.PLATFORM),
        OPENER: pct(dist.OPENER ?? base.OPENER),
        INCORPORATOR: pct(dist.INCORPORATOR ?? base.INCORPORATOR),
        CONTRACTOR: pct(dist.CONTRACTOR ?? base.CONTRACTOR),
        TECHNICIAN: pct(dist.TECHNICIAN ?? base.TECHNICIAN)
    };
    if (out.TECHNICIAN > out.CONTRACTOR) {
        throw new Error('TECHNICIAN no puede exceder CONTRACTOR');
    }
    if (out.PLATFORM + out.OPENER + out.INCORPORATOR + out.CONTRACTOR > 100) {
        throw new Error('PLATFORM + OPENER + INCORPORATOR + CONTRACTOR no puede exceder 100');
    }
    return out;
}

/**
 * Reparto de un servicio. Los porcentajes se aplican SOLO sobre la mano de obra;
 * los materiales se reembolsan 100% al contratista; el IVA no se reparte.
 *
 *   contratista (bruto) = CONTRACTOR% de la mano de obra
 *   aperturador / incorporador = su % (solo si existen)
 *   plataforma = PLATFORM% (la empresa)
 *   sinAsignar = lo que reste de la mano de obra (no se le da a nadie)
 *   técnico = porcentajeTecnico% de la mano de obra (se resta a la parte del contratista; quien llama pasa
 *             config.TECHNICIAN si la cita tiene técnico, 0 si no)
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
    const { PLATFORM, OPENER, INCORPORATOR, CONTRACTOR } = config;
    const pTec = pct(porcentajeTecnico);

    const pOpener = hasOpener ? OPENER : 0;
    const pIncorporator = hasIncorporator ? INCORPORATOR : 0;

    const montoOpener = Math.round((mo * pOpener) / 100);
    const montoIncorporator = Math.round((mo * pIncorporator) / 100);
    const contratistaBruto = Math.round((mo * CONTRACTOR) / 100);
    const montoPlatform = Math.min(Math.round((mo * PLATFORM) / 100), Math.max(0, mo - contratistaBruto - montoOpener - montoIncorporator));
    // Lo que no recibe nadie queda aparte (evita descuadres por redondeo y no se regala a la plataforma)
    const montoSinAsignar = Math.max(0, mo - contratistaBruto - montoOpener - montoIncorporator - montoPlatform);

    const montoTecnico = Math.min(contratistaBruto, Math.round((mo * pTec) / 100));
    const contratistaMO = contratistaBruto - montoTecnico;

    return {
        plataforma: { porcentaje: PLATFORM, monto: montoPlatform },
        aperturador: { porcentaje: pOpener, monto: montoOpener },
        incorporador: { porcentaje: pIncorporator, monto: montoIncorporator },
        tecnico: { porcentaje: pTec, monto: montoTecnico },
        sinAsignar: { porcentaje: mo > 0 ? Math.round(((montoSinAsignar / mo) * 100) * 100) / 100 : 0, monto: montoSinAsignar },
        contratista: {
            porcentaje: CONTRACTOR,
            montoManoDeObraBruto: contratistaBruto,
            montoManoDeObra: contratistaMO,
            montoMateriales: materiales,
            montoTotal: contratistaMO + materiales
        }
    };
};
