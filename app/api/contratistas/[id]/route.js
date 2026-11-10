import { connectDB } from '@/lib/mongoose'
import Area from '@/models/Area'
import Contratista from '@/models/Contratista'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { requireSession } from '@/lib/session'
import { esObjectId, pick } from '@/lib/sanitize'
import { relacionCon, camposPara, aplicarReglasAprobacion, SELECT_PUBLICO } from '@/lib/contratista-acceso'
import { permisoCambioZona } from '@/lib/datos-incorporacion'
import { validarZonas, zonasDeBody, zonasDe, sincronizarAreas } from '@/lib/zona-contratista'

// GET: Obtener un contratista específico por ID
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request);
    if (error) return error;
    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });

    const contratista = await Contratista.findById(id).populate('servicios');

    if (!contratista) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    // Perfil completo para admin / el propio / su incorporador; para el resto, solo datos públicos.
    if (!(await relacionCon(session, contratista))) {
      const publico = await Contratista.findById(id).select(SELECT_PUBLICO).populate('servicios', 'nombre categoria');
      return NextResponse.json(publico);
    }

    return NextResponse.json(contratista);
  } catch (error) {
    console.error('Error al obtener contratista:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT: Actualizar un contratista. Solo admin, el propio contratista o su incorporador, cada uno con su lista de campos
// (lib/contratista-acceso.js); aprobar exige los datos escritos requeridos; la disponibilidad (`activo`) solo si está aprobado.
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request);
    if (error) return error;
    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });

    const contratistaActual = await Contratista.findById(id);
    if (!contratistaActual) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    const relacion = await relacionCon(session, contratistaActual);
    if (!relacion) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const body = await request.json();

    // La zona la asigna el incorporador (o el admin): si el contratista la manda, 403 explícito, no se ignora
    const permisoZona = permisoCambioZona(relacion, zonasDeBody(body));
    if (!permisoZona.ok) return NextResponse.json({ error: permisoZona.error }, { status: permisoZona.status });

    let data = pick(body, camposPara(relacion));
    delete data.areaId;
    delete data.areasIds;
    const zonasPedidas = zonasDeBody(body);
    if (zonasPedidas !== undefined) {
      const zonas = await validarZonas(zonasPedidas);
      if (!zonas.ok) return NextResponse.json({ error: zonas.error }, { status: zonas.status });
      data.areasIds = zonas.areasIds;
      data.areaId = zonas.areaId;
    }
    const reglas = aplicarReglasAprobacion(relacion, contratistaActual, data);
    if (reglas.error) {
      return NextResponse.json(
        { error: reglas.error.message, ...(reglas.error.faltantes ? { faltantes: reglas.error.faltantes } : {}) },
        { status: reglas.error.status }
      );
    }
    data = reglas.data;

    for (const [k, v] of Object.entries(data)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !['ubicacion', 'informacionPago'].includes(k)) {
        return NextResponse.json({ error: `Valor inválido en ${k}` }, { status: 400 });
      }
    }
    if (data.password !== undefined) {
      if (typeof data.password !== 'string' || data.password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
      data.password = await bcrypt.hash(data.password, 12);
    }

    // Cambio de zonas: mantener el array contratistas de cada Area
    if (data.areasIds !== undefined) {
      await sincronizarAreas(id, zonasDe(contratistaActual), data.areasIds);
    }

    // Actualizar el contratista
    const contratista = await Contratista.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true, upsert: false }
    );


    return NextResponse.json(contratista);

  } catch (error) {
    console.error('Error al actualizar contratista:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar un contratista específico por ID
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;
    const { id } = await params;

    const contratista = await Contratista.findByIdAndDelete(id);

    if (!contratista) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Contratista eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar contratista:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
