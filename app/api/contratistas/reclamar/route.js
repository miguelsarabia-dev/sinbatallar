import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import Incorporador from '@/models/Incorporador';
import { NextResponse } from 'next/server';

// POST: Reclamar un contratista disponible (sin incorporador)
export async function POST(request) {
  try {
    await connectDB();

    const { contratistaId, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado: ID de usuario requerido' }, { status: 401 });
    }

    if (!contratistaId) {
      return NextResponse.json(
        { error: 'ID del contratista es requerido' },
        { status: 400 }
      );
    }

    // Obtener el incorporador del usuario actual
    const incorporador = await Incorporador.findOne({ user: userId });

    if (!incorporador) {
      return NextResponse.json(
        { error: 'No se encontró el perfil de incorporador' },
        { status: 404 }
      );
    }

    // Verificar que el contratista exista y no tenga incorporador
    const contratista = await Contratista.findById(contratistaId);
    if (!contratista) {
      return NextResponse.json(
        { error: 'Contratista no encontrado' },
        { status: 404 }
      );
    }

    if (contratista.incorporador) {
      return NextResponse.json(
        { error: 'Este contratista ya tiene un incorporador asignado' },
        { status: 400 }
      );
    }

    // Asignar el incorporador y activar al contratista
    contratista.incorporador = incorporador._id;
    contratista.activo = true;
    contratista.estatus = 'activo';
    await contratista.save();

    // Actualizar las estadísticas del incorporador
    if (!incorporador.contratistasIncorporados.includes(contratistaId)) {
      incorporador.contratistasIncorporados.push(contratistaId);
    }

    incorporador.estadisticas.totalContratistasIncorporados = incorporador.contratistasIncorporados.length;
    incorporador.estadisticas.contratistasActivos = await Contratista.countDocuments({
      incorporador: incorporador._id,
      activo: true
    });
    incorporador.estadisticas.ultimoContratistaIncorporado = new Date();

    await incorporador.save();

    // Obtener el contratista actualizado con datos poblados
    const contratistaActualizado = await Contratista.findById(contratistaId)
      .populate('servicios', 'nombre descripcion categoria')
      .populate('incorporador');

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
