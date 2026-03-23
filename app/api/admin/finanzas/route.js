import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Comision from '@/models/Comision';

// GET - Obtener reporte financiero
export async function GET(request) {
    try {
        await connectDB();

        // Obtener parámetros
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const search = searchParams.get('search') || '';

        // Construir match stage para fechas
        const matchStage = {};
        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: end
            };
        }

        console.log('Consultando finanzas con filtro:', { matchStage, search });

        // Pipeline de agregación
        const pipeline = [
            { $match: matchStage },
            { $sort: { createdAt: -1 } },
            // Lookup Cita
            {
                $lookup: {
                    from: 'citas',
                    localField: 'cita',
                    foreignField: '_id',
                    as: 'citaData'
                }
            },
            { $unwind: { path: '$citaData', preserveNullAndEmptyArrays: true } },
            // Lookup Cliente (User)
            {
                $lookup: {
                    from: 'users',
                    localField: 'citaData.cliente',
                    foreignField: '_id',
                    as: 'clienteData'
                }
            },
            { $unwind: { path: '$clienteData', preserveNullAndEmptyArrays: true } },
            // Lookup Contratista
            {
                $lookup: {
                    from: 'contratistas',
                    localField: 'distribucion.contratista.id',
                    foreignField: '_id',
                    as: 'contratistaData'
                }
            },
            { $unwind: { path: '$contratistaData', preserveNullAndEmptyArrays: true } }
        ];

        // Agregar filtro de búsqueda si existe
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { 'citaData._id': { $toString: searchRegex } }, // Búsqueda por ID de cita (parcial)
                        { 'clienteData.nombre': searchRegex },
                        { 'clienteData.email': searchRegex },
                        { 'contratistaData.nombre': searchRegex }
                    ]
                }
            });
        }

        // Ejecutar agregación
        const commissionsRaw = await Comision.aggregate(pipeline);

        // Procesar resultados para formato frontend y AUTO-CORRECCIÓN
        const commissions = await Promise.all(commissionsRaw.map(async (comm) => {
            const cita = comm.citaData;
            let estadoPago = comm.estadoPago;

            // AUTO-CORRECCIÓN: Si la cita está completada pero el pago a contratista sigue "pendiente", 
            // esto es inconsistente. Lo actualizamos a "disponible".
            if (cita?.estado === 'completada' && estadoPago === 'pendiente') {
                estadoPago = 'disponible';
                // Actualizar en DB asíncronamente (sin await para no bloquear respuesta)
                Comision.findByIdAndUpdate(comm._id, { estadoPago: 'disponible' }).catch(console.error);
                console.log(`Auto-corrigiendo comisión ${comm._id} a disponible`);
            }

            return {
                ...comm,
                estadoPago, // Usar el estado corregido
                cita: cita,
                distribucion: {
                    ...comm.distribucion,
                    contratista: {
                        ...comm.distribucion.contratista,
                        id: comm.contratistaData
                    }
                }
            };
        }));

        // Calcular totales (sobre los resultados filtrados)
        const summary = commissions.reduce((acc, curr) => {
            acc.totalServiceValue += (curr.totalServicio || 0);
            acc.totalPlatformCommission += (curr.distribucion?.plataforma?.monto || 0);
            acc.totalContractorPayout += (curr.distribucion?.contratista?.montoTotal || 0);
            return acc;
        }, {
            totalServiceValue: 0,
            totalPlatformCommission: 0,
            totalContractorPayout: 0
        });

        return NextResponse.json({
            summary,
            commissions
        });

    } catch (error) {
        console.error('Error cargando reporte financiero:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
