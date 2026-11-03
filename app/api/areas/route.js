import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Area from '@/models/Area';
import Contratista from '@/models/Contratista';
import Aperturador from '@/models/Aperturador';
import { getSessionFromRequest, requireSession } from '@/lib/session';
import { esObjectId, escaparRegex } from '@/lib/sanitize';
import { perfilIdDe } from '@/lib/perfiles';
import { puedeEditarArea, SELECT_AREA_PUBLICA } from '@/lib/areas-acceso';


// GET - Obtener todas las áreas
export async function GET(request) {
  try {
    await connectDB();

    const session = await getSessionFromRequest(request);
    const { searchParams } = new URL(request.url);

    // Admin: todo. Aperturador: sus zonas completas. Resto (incluido sin sesión): solo zonas activas, datos públicos.
    let areas;
    if (session?.role === 'admin') {
      areas = await Area.find()
        .populate('contratistas', 'nombre email telefono promedioCalificacion')
        .populate('aperturador')
        .sort({ createdAt: -1 });
    } else if (session?.role === 'aperturador') {
      const miId = await perfilIdDe(session);
      areas = await Area.find({ aperturador: miId })
        .populate('contratistas', 'nombre email telefono promedioCalificacion')
        .populate('aperturador')
        .sort({ createdAt: -1 });
    } else {
      areas = await Area.find({ activo: true }).select(SELECT_AREA_PUBLICA).sort({ createdAt: -1 });
    }
    return NextResponse.json(areas);
  } catch (error) {
    console.error('Error obteniendo áreas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva área
export async function POST(request) {
  try {
    const { session, error } = await requireSession(request, ['aperturador', 'admin']);
    if (error) return error;

    const body = await request.json();
    const { nombre, descripcion, municipio, estado, tipo, codigoPostal, clasificacion, poligono, contratistas = [], estadisticas } = body;
    // Un aperturador crea zonas a su nombre; el admin puede asignar otro aperturador
    const aperturadorId = session.role === 'aperturador' ? await perfilIdDe(session) : (esObjectId(body.aperturadorId) ? body.aperturadorId : null);

    // Validaciones
    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del área es requerido' },
        { status: 400 }
      );
    }

    if (!poligono || !poligono.coordinates || !Array.isArray(poligono.coordinates)) {
      return NextResponse.json(
        { error: 'Los datos del polígono son requeridos' },
        { status: 400 }
      );
    }

    if (!['C', 'B', 'A', 'AA', 'AAA'].includes(clasificacion)) {
      return NextResponse.json(
        { error: 'Clasificación inválida' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verificar que no exista otra área con el mismo nombre
    const areaExistente = await Area.findOne({
      nombre: { $regex: new RegExp(`^${escaparRegex(nombre.trim())}$`, 'i') }
    });

    if (areaExistente) {
      return NextResponse.json(
        { error: 'Ya existe un área con ese nombre' },
        { status: 409 }
      );
    }

    // Validar contratistas si se proporcionan
    if (contratistas.length > 0) {
      const contratistasValidos = await Contratista.find({
        _id: { $in: contratistas }
      }).select('_id');

      if (contratistasValidos.length !== contratistas.length) {
        return NextResponse.json(
          { error: 'Algunos contratistas no son válidos' },
          { status: 400 }
        );
      }
    }

    // Crear el área
    const nuevaArea = new Area({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
      municipio: municipio?.trim() || '',
      estado: estado?.trim() || '',
      tipo: tipo?.trim() || '',
      codigoPostal: codigoPostal?.trim() || '',
      clasificacion,
      poligono,
      contratistas: contratistas || [],
      aperturador: aperturadorId || null,
      estadisticas: estadisticas || {
        viviendas: 0,
        negocios: 0,
        edificios: 0,
        ultimaActualizacion: null
      }
    });

    await nuevaArea.save();

    // Si hay aperturador, actualizar sus estadísticas
    if (aperturadorId) {
      await Aperturador.findByIdAndUpdate(
        aperturadorId,
        {
          $push: { areasCreadas: nuevaArea._id },
          $inc: {
            'estadisticas.totalAreasCreadas': 1,
            'estadisticas.areasActivas': 1
          }
        }
      );
    }

    // Poblar la respuesta
    const areaCompleta = await Area.findById(nuevaArea._id)
      .populate('contratistas', 'nombre email telefono promedioCalificacion')
      .populate('aperturador');

    return NextResponse.json(areaCompleta, { status: 201 });
  } catch (error) {
    console.error('Error creando área:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar área existente
export async function PUT(request) {
  try {
    const { session, error } = await requireSession(request, ['aperturador', 'admin']);
    if (error) return error;

    const body = await request.json();
    const { _id, nombre, descripcion, municipio, estado, tipo, codigoPostal, clasificacion, poligono, contratistas = [] } = body;

    if (!_id) {
      return NextResponse.json(
        { error: 'ID del área es requerido' },
        { status: 400 }
      );
    }

    await connectDB();

    if (!esObjectId(_id)) {
      return NextResponse.json({ error: 'ID del área no válido' }, { status: 400 });
    }
    const area = await Area.findById(_id);
    if (!area) {
      return NextResponse.json(
        { error: 'Área no encontrada' },
        { status: 404 }
      );
    }
    if (!(await puedeEditarArea(session, area))) {
      return NextResponse.json({ error: 'No autorizado para esta zona' }, { status: 403 });
    }

    // Verificar nombre único (excluyendo el área actual)
    if (nombre && nombre.trim() !== area.nombre) {
      const areaExistente = await Area.findOne({
        nombre: { $regex: new RegExp(`^${escaparRegex(nombre.trim())}$`, 'i') },
        _id: { $ne: _id }
      });

      if (areaExistente) {
        return NextResponse.json(
          { error: 'Ya existe un área con ese nombre' },
          { status: 409 }
        );
      }
    }

    // Validar contratistas si se proporcionan
    if (contratistas.length > 0) {
      const contratistasValidos = await Contratista.find({
        _id: { $in: contratistas }
      }).select('_id');

      if (contratistasValidos.length !== contratistas.length) {
        return NextResponse.json(
          { error: 'Algunos contratistas no son válidos' },
          { status: 400 }
        );
      }
    }

    // Actualizar campos
    if (nombre) area.nombre = nombre.trim();
    if (descripcion !== undefined) area.descripcion = descripcion.trim();
    if (municipio !== undefined) area.municipio = municipio.trim();
    if (estado !== undefined) area.estado = estado.trim();
    if (tipo !== undefined) area.tipo = tipo.trim();
    if (codigoPostal !== undefined) area.codigoPostal = codigoPostal.trim();
    if (clasificacion) area.clasificacion = clasificacion;
    if (poligono) area.poligono = poligono;
    if (Array.isArray(contratistas)) area.contratistas = contratistas;

    await area.save();

    // Poblar la respuesta
    const areaActualizada = await Area.findById(area._id)
      .populate('contratistas', 'nombre email telefono promedioCalificacion');

    return NextResponse.json(areaActualizada);
  } catch (error) {
    console.error('Error actualizando área:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
