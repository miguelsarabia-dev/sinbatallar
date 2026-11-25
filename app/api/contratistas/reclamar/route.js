import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import Asociado from '@/models/Asociado';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { perfilIdDe } from '@/lib/perfiles';

// POST: Reclamar un contratista disponible (sin asociado)
export async function POST(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['asociado']);
    if (error) return error;
    const userId = session.id; // del token
    const { contratistaId } = await request.json();

    if (!contratistaId || typeof contratistaId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(contratistaId)) {
      return NextResponse.json(
        { error: 'ID del contratista es requerido' },
        { status: 400 }
      );
    }

    // Obtener el asociado del usuario actual
    const perfilId = await perfilIdDe(session);
    const asociado = perfilId ? await Asociado.findById(perfilId) : null;

    if (!asociado) {
      return NextResponse.json(
        { error: 'No se encontró el perfil de asociado' },
        { status: 404 }
      );
    }

    // Verificar que el contratista exista y no tenga asociado
    const contratista = await Contratista.findById(contratistaId);
    if (!contratista) {
      return NextResponse.json(
        { error: 'Contratista no encontrado' },
        { status: 404 }
      );
    }

    if (contratista.asociado) {
      return NextResponse.json(
        { error: 'Este contratista ya tiene un asociado asignado' },
        { status: 400 }
      );
    }

    // Asignar el asociado y activar al contratista
    contratista.asociado = asociado._id;
    contratista.aprobado = true;
    contratista.activo = true;
    contratista.estatus = 'activo';
    await contratista.save();

    // Actualizar las estadísticas del asociado
    if (!asociado.contratistasIncorporados.includes(contratistaId)) {
      asociado.contratistasIncorporados.push(contratistaId);
    }

    asociado.estadisticas.totalContratistasIncorporados = asociado.contratistasIncorporados.length;
    asociado.estadisticas.contratistasActivos = await Contratista.countDocuments({
      asociado: asociado._id,
      activo: true
    });
    asociado.estadisticas.ultimoContratistaIncorporado = new Date();

    await asociado.save();

    // Obtener el contratista actualizado con datos poblados
    const contratistaActualizado = await Contratista.findById(contratistaId)
      .populate('servicios', 'nombre descripcion categoria')
      .populate('asociado');

    return NextResponse.json({
      message: 'Contratista reclamado exitosamente',
      contratista: contratistaActualizado
    });
  } catch (error) {
    console.error('Error reclamando contratista:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
