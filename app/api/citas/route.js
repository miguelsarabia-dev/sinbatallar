// app/api/citas/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Cita from '@/models/Cita';
import Contratista from '@/models/Contratista';
import Servicio from '@/models/Servicio';
import User from '@/models/User';
import { enviarNotificacionCambioEstado } from '@/lib/email-service';
import { uploadMultipleImages } from '@/lib/cloudinary';
import { resolverAreaId } from '@/lib/geo-utils';
import Comision from '@/models/Comision';
import { idSeguro } from '@/lib/sanitize';
import Tecnico from '@/models/Tecnico';
import { getSessionFromRequest, requireSession } from '@/lib/session';
import { cambiarEstadoCita } from '@/lib/citas-estado';
import { citasPorLiquidar } from '@/lib/liquidacion-db';
import { getFinancialConfig, gananciaDeCita, resolverCotizacionAceptada } from '@/lib/comisiones';

// GET - Obtener citas
export async function GET(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['cliente', 'contratista', 'tecnico', 'admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const fecha = searchParams.get('fecha');
    const activa = searchParams.get('activa');

    // El alcance sale del token; los ids de la query solo los respeta el admin.
    let filter = {};
    let clienteId = null;
    if (session.role === 'cliente') {
      clienteId = session.id;
      filter.cliente = session.id;
    } else if (session.role === 'contratista') {
      filter.contratista = session.id;
    } else if (session.role === 'tecnico') {
      const tecnico = await Tecnico.findOne({ user: session.id }).select('_id');
      filter.tecnico = tecnico?._id || null;
    } else {
      if (idSeguro(searchParams.get('clienteId'))) { clienteId = searchParams.get('clienteId'); filter.cliente = clienteId; }
      if (idSeguro(searchParams.get('contratistaId'))) filter.contratista = searchParams.get('contratistaId');
      if (idSeguro(searchParams.get('tecnicoId'))) filter.tecnico = searchParams.get('tecnicoId');
    }

    if (estado) {
      const estados = estado.split(',').map(e => e.trim());
      if (estados.length === 1) {
        filter.estado = estados[0];
      } else {
        filter.estado = { $in: estados };
      }
    }

    if (activa === 'true') {
      filter.estado = { $nin: ['completada', 'cancelada', 'rechazada'] };
    }

    if (fecha) {
      const fechaInicio = new Date(fecha);
      const fechaFin = new Date(fecha);
      fechaFin.setDate(fechaFin.getDate() + 1);

      filter.fechaProgramada = {
        $gte: fechaInicio,
        $lt: fechaFin
      };
    }

    const citas = await Cita.find(filter)
      .populate('cliente', 'nombre email telefono')
      .populate('contratista', 'nombre email telefono promedioCalificacion')
      .populate('servicio', 'nombre descripcion categoria')
      .populate({
        path: 'cotizaciones',
        match: clienteId ? { estado: { $nin: ['pendiente', 'pendiente_contratista', 'rechazada_contratista'] } } : {},
        populate: {
          path: 'contratista',
          select: 'nombre email telefono'
        }
      })
      .populate({
        path: 'cotizacionAceptada',
        populate: {
          path: 'contratista',
          select: 'nombre email telefono'
        }
      })
      .populate({ path: 'tecnico', populate: { path: 'user', select: 'nombre email telefono' } })
      .sort({ createdAt: -1, fechaProgramada: 1 });

    // Ganancia por cita: solo para el contratista dueño, su técnico o el admin (la sesión es opcional).
    const verGanancias = ['contratista', 'tecnico', 'admin'].includes(session?.role);
    const config = verGanancias ? await getFinancialConfig() : null;
    const cache = {};
    let tecnicoSesionId = null;
    const comisionPorCita = {};
    if (verGanancias) {
      if (session.role === 'tecnico') {
        tecnicoSesionId = String((await Tecnico.findOne({ user: session.id }).select('_id'))?._id || '');
      }
      const comisiones = await Comision.find({ cita: { $in: citas.map(c => c._id) } });
      comisiones.forEach(c => { comisionPorCita[String(c.cita)] = c; });
    }

    // Resolver areaId de cada cita: usar la zona persistida; si falta pero hay
    // coordenadas, calcularla al vuelo y persistirla (self-healing para citas viejas).
    const citasConArea = await Promise.all(
      citas.map(async (cita) => {
        let areaId = cita.ubicacion?.zona || null;

        if (!areaId && cita.ubicacion?.coordenadas) {
          areaId = await resolverAreaId(cita.ubicacion.coordenadas);
          if (areaId) {
            cita.ubicacion.zona = areaId;
            await cita.save().catch(err =>
              console.error('Error persistiendo zona de cita', cita._id, err)
            );
          }
        }

        const obj = cita.toObject();
        obj.areaId = areaId || null;
        // Express sin atender: sigue 'solicitada' pasados 30 min
        obj.urgenteSinAtender = !!cita.esExpress && cita.estado === 'solicitada' &&
          Date.now() - new Date(cita.createdAt).getTime() > 30 * 60 * 1000;

        const esDueno = session?.role === 'contratista' && String(cita.contratista?._id || '') === session.id;
        const esSuTecnico = session?.role === 'tecnico' && !!tecnicoSesionId && String(cita.tecnico?._id || '') === tecnicoSesionId;
        const esAdmin = session?.role === 'admin';

        if (esDueno || esSuTecnico || esAdmin) {
          const cotizacion = cita.cotizacionAceptada?._id ? cita.cotizacionAceptada : await resolverCotizacionAceptada(cita);
          const g = cotizacion
            ? await gananciaDeCita(cita, { comision: comisionPorCita[String(cita._id)], cotizacion, config, cache })
            : null;
          if (g) {
            obj.ganancia = esSuTecnico
              ? { gananciaTecnico: g.gananciaTecnico, liberacionTecnico: g.liberacionTecnico, estimada: g.estimada }
              : g;
          }
        } else if (obj.tecnico) {
          delete obj.tecnico.porcentajeGanancia; // el % del técnico es privado del contratista
        }
        return obj;
      })
    );

    // Para contratista y técnico, las express (urgentes) primero; el resto conserva el orden por fecha
    if (session.role === 'contratista' || session.role === 'tecnico') {
      citasConArea.sort((a, b) => (b.esExpress ? 1 : 0) - (a.esExpress ? 1 : 0));
    }

    return NextResponse.json(citasConArea);

  } catch (error) {
    console.error('Error al obtener citas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva cita
export async function POST(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['cliente']);
    if (error) return error;

    // Forzar la liquidación: con un servicio terminado por el técnico sin liquidar no se pide otro
    const porLiquidar = await citasPorLiquidar(session.id);
    if (porLiquidar.length) {
      return NextResponse.json(
        { error: 'Tienes un servicio terminado pendiente de liquidar. Liquídalo para poder solicitar otro.', code: 'LIQUIDACION_PENDIENTE', citaIds: porLiquidar },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const clienteId = session.id; // del token; el campo del body se ignora
    const servicioId = formData.get('servicioId');
    const descripcionProblema = formData.get('descripcionProblema');
    const ubicacion = JSON.parse(formData.get('ubicacion') || '{}');
    const fechaProgramada = formData.get('fechaProgramada');

    // Procesar imágenes - Subir a Cloudinary
    const imagenesProblema = [];
    const imageFiles = formData.getAll('imagenesProblema');

    if (imageFiles && imageFiles.length > 0) {
      const imagenesValidas = imageFiles.filter(file => file && file.size > 0);

      if (imagenesValidas.length > 0) {
        try {
          const uploadResults = await uploadMultipleImages(imagenesValidas, {
            folder: 'sinbatallar/citas/problemas',
            quality: 'auto:good',
            transformation: {
              width: 1200,
              height: 1200,
              crop: 'limit'
            }
          });

          imagenesProblema.push(...uploadResults.map(r => r.url));
        } catch (error) {
          console.error('Error subiendo imágenes:', error);
        }
      }
    }

    // Resolver la zona (Area) a partir de las coordenadas de la ubicación seleccionada
    ubicacion.zona = await resolverAreaId(ubicacion.coordenadas);

    // Crear la cita
    const nuevaCita = new Cita({
      cliente: clienteId,
      servicio: servicioId,
      descripcionProblema,
      imagenesProblema,
      ubicacion,
      fechaProgramada: fechaProgramada ? new Date(fechaProgramada) : null,
      esExpress: formData.get('esExpress') === 'true',
      estado: 'solicitada'
    });

    await nuevaCita.save();

    // Notificar la creación (asignación a contratista ocurrirá después)
    const servicio = await Servicio.findById(servicioId);
    const cliente = await User.findById(clienteId);


    enviarNotificacionCambioEstado({
      nuevoEstado: 'solicitada',
      cita: nuevaCita,
      cliente,
      contratista: null,
      servicio
    }).catch(err => console.error('Error enviando email:', err));

    return NextResponse.json({
      message: 'Cita creada exitosamente. Esperando asignación de contratista.',
      citaId: nuevaCita._id,
      estado: nuevaCita.estado
    });

  } catch (error) {
    console.error('Error al crear cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar estado de cita (body: { citaId, estado|nuevoEstado, comentario }).
// El actor sale del token; userId/userRole del body se ignoran. Mismas reglas que PATCH /citas/:id.
export async function PUT(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request);
    if (error) return error;

    const data = await request.json();
    const { citaId, estado, nuevoEstado, comentario } = data;

    const cita = await Cita.findById(citaId);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const resultado = await cambiarEstadoCita({ cita, estado: estado || nuevoEstado, comentario, session });
    if (resultado.error) {
      return NextResponse.json({ error: resultado.error.message }, { status: resultado.error.status });
    }

    await cita.populate('cliente', 'nombre email telefono');
    await cita.populate('contratista', 'nombre email telefono');
    await cita.populate('servicio', 'nombre descripcion categoria');
    await cita.populate('cotizaciones');
    await cita.populate('cotizacionAceptada');

    if (resultado.cambio) {
      enviarNotificacionCambioEstado({
        nuevoEstado: cita.estado,
        cita,
        cliente: cita.cliente,
        contratista: cita.contratista,
        servicio: cita.servicio,
        cotizacion: cita.cotizacionAceptada,
        canceladoPor: resultado.canceladoPor
      }).catch(err => console.error('Error enviando emails:', err));
    }

    return NextResponse.json({
      message: 'Estado de cita actualizado exitosamente',
      cita
    });

  } catch (error) {
    console.error('Error al actualizar cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
