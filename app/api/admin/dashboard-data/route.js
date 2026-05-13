import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import Contratista from '@/models/Contratista';
import Servicio from '@/models/Servicio';
import Cotizacion from '@/models/Cotizacion';
import Cita from '@/models/Cita';
import Area from '@/models/Area';
import Aperturador from '@/models/Aperturador';
import Incorporador from '@/models/Incorporador';
import Ferretero from '@/models/Ferretero';

// GET - Obtener todos los datos del dashboard en una sola llamada optimizada
export async function GET() {
    try {
        await connectDB();

        console.log('Iniciando carga optimizada del dashboard...');
        const startTime = Date.now();

        // Ejecutar todas las consultas en paralelo
        const [
            users,
            contratistas,
            servicios,
            cotizaciones,
            citas,
            areas,
            aperturadores,
            incorporadores,
            ferreteros
        ] = await Promise.all([
            // 1. Usuarios (Solo campos necesarios para lista y contadores)
            User.find({}).select('nombre email role telefono createdAt').lean(),

            // 2. Contratistas
            Contratista.find({}).select('nombre email telefono promedioCalificacion servicios activo createdAt').lean(),

            // 3. Servicios
            Servicio.find({}).select('nombre descripcion categoria tipo precioBase imagenUrl promedioCalificacion createdAt').lean(),

            // 4. Cotizaciones (Populate ligero)
            Cotizacion.find({})
                .select('cita contratista estado total subtotal iva manoDeObra materiales createdAt')
                .populate('contratista', 'nombre')
                .populate({
                    path: 'cita',
                    select: 'cliente servicio',
                    populate: [
                        { path: 'cliente', select: 'nombre' },
                        { path: 'servicio', select: 'nombre' }
                    ]
                })
                .lean(),

            // 5. Citas
            Cita.find({})
                .select('cliente servicio estado fechaProgramada horaInicio total calificacion createdAt')
                .populate('cliente', 'nombre')
                .populate('servicio', 'nombre')
                .lean(),

            // 6. Areas
            Area.find({})
                .select('nombre descripcion clasificacion estadisticas contratistas createdAt')
                .populate('contratistas', 'nombre promedioCalificacion')
                .lean(),

            // 7. Aperturadores
            Aperturador.find({})
                .select('user activo estadisticas configuracion createdAt')
                .populate('user', 'nombre email telefono')
                .lean(),

            // 8. Incorporadores
            Incorporador.find({})
                .select('user activo estadisticas configuracion createdAt')
                .populate('user', 'nombre email telefono')
                .lean(),

            // 9. Ferreteros
            Ferretero.find({})
                .select('nombreNegocio telefono activo catalogoActivo pendienteAprobacion createdAt user')
                .populate('user', 'nombre email telefono')
                .lean()
        ]);

        const endTime = Date.now();
        console.log(`Carga del dashboard completada en ${endTime - startTime}ms`);

        return NextResponse.json({
            users,
            contratistas,
            servicios,
            cotizaciones,
            citas,
            areas,
            aperturadores,
            incorporadores,
            ferreteros,
            meta: {
                loadTime: endTime - startTime,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('Error FATAL en carga de dashboard:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor al cargar datos del dashboard' },
            { status: 500 }
        );
    }
}
