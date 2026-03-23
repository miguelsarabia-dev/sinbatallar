export const FINANCIAL_CONFIG = {
    // Porcentajes de distribución (sobre la Mano de Obra solamente)
    // Los materiales siempre se reembolsan al 100% al contratista
    DISTRIBUTION: {
        PLATFORM_BASE: 15,  // Porcentaje base de la plataforma (sobre mano de obra)
        OPENER: 2,          // Porcentaje para Aperturadores (sobre mano de obra)
        INCORPORATOR: 3,    // Porcentaje para Incorporadores (sobre mano de obra)
        CONTRACTOR: 85      // Porcentaje para Contratistas (sobre mano de obra)
    },

    // Impuestos (Adicional al Subtotal)
    TAX: {
        VAT_RATE: 0.16      // 16% IVA
    }
};

/**
 * Calcula la distribución de una comisión basada en la jerarquía del contratista.
 * Los porcentajes se aplican SOLO sobre la mano de obra.
 * Los materiales se reembolsan al 100% al contratista.
 * 
 * @param {Object} params
 * @param {number} params.manoDeObra - Monto de mano de obra
 * @param {number} params.costoMateriales - Costo de materiales (reembolso directo)
 * @param {boolean} params.hasOpener - Si hay un Aperturador asignado
 * @param {boolean} params.hasIncorporator - Si hay un Incorporador asignado
 * @returns {Object} Distribución calculada
 */
export const calculateDistribution = ({ manoDeObra, costoMateriales = 0, hasOpener, hasIncorporator }) => {
    const { PLATFORM_BASE, OPENER, INCORPORATOR } = FINANCIAL_CONFIG.DISTRIBUTION;

    // Si no hay aperturador/incorporador, su porcentaje regresa a la plataforma
    let platformPercentage = PLATFORM_BASE;

    if (!hasOpener) {
        platformPercentage += OPENER;
    }

    if (!hasIncorporator) {
        platformPercentage += INCORPORATOR;
    }

    const contractorPercentage = 100 - platformPercentage;

    return {
        platform: {
            percentage: platformPercentage,
            amount: Math.round((manoDeObra * platformPercentage) / 100)
        },
        opener: {
            percentage: hasOpener ? OPENER : 0,
            amount: hasOpener ? Math.round((manoDeObra * OPENER) / 100) : 0
        },
        incorporator: {
            percentage: hasIncorporator ? INCORPORATOR : 0,
            amount: hasIncorporator ? Math.round((manoDeObra * INCORPORATOR) / 100) : 0
        },
        contractor: {
            percentage: contractorPercentage,
            montoManoDeObra: Math.round((manoDeObra * contractorPercentage) / 100),
            montoMateriales: costoMateriales,
            montoTotal: Math.round((manoDeObra * contractorPercentage) / 100) + costoMateriales
        }
    };
};
