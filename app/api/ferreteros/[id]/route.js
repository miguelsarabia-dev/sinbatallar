// app/api/ferreteros/[id]/route.js
import { NextResponse } from 'next/server';
import { enviarPush } from '@/lib/push';
import { requireSession, getSessionFromRequest } from '@/lib/session';
import { esObjectId, pick } from '@/lib/sanitize';

import { connectDB } from '@/lib/mongoose';
import Ferretero from '@/models/Ferretero';
import User from '@/models/User';
import Material from '@/models/Material';

// GET /api/ferreteros/[id]
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const ferretero = await Ferretero.findById(id).populate('user', 'nombre email telefono fotoUrl');
    if (!ferretero) {
      return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ferretero);
  } catch (error) {
    console.error('Error en GET /api/ferreteros/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/ferreteros/[id]
// Actualiza nombreNegocio, telefono, activo, catalogoActivo
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['ferretero', 'admin']);
    if (error) return error;
    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
    const body = await request.json();

    const ferretero = await Ferretero.findById(id);
    if (!ferretero) {
      return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
    }
    if (session.role === 'ferretero' && ferretero.user.toString() !== session.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // El ferretero edita su negocio; aprobar/activar la cuenta es solo del admin.
    const camposPermitidos = session.role === 'admin'
      ? ['nombreNegocio', 'telefono', 'direccion', 'horario', 'activo', 'catalogoActivo', 'pendienteAprobacion']
      : ['nombreNegocio', 'telefono', 'direccion', 'horario', 'catalogoActivo'];
    if (session.role !== 'admin' && body.catalogoActivo === true && !ferretero.activo) {
      return NextResponse.json({ error: 'Tu cuenta aún no está aprobada' }, { status: 403 });
    }
    camposPermitidos.forEach(campo => {
      if (body[campo] !== undefined) ferretero[campo] = body[campo];
    });

    // Actualizar ubicación si viene { lat, lng }
    if (body.ubicacion?.lat != null && body.ubicacion?.lng != null) {
      ferretero.ubicacion = {
        type: 'Point',
        coordinates: [body.ubicacion.lng, body.ubicacion.lat]
      };
    }

    const recienActivado = body.activo === true && session.role === 'admin' && !ferretero.isNew && ferretero.isModified('activo');
    await ferretero.save();
    if (recienActivado) {
      await enviarPush([ferretero.user], { titulo: '¡Cuenta aprobada!', cuerpo: 'Tu ferretería ya está activa', data: { tipo: 'cuenta_aprobada' } });
    }

    // Si se desactiva el catálogo, desactivar todos sus materiales también
    if (body.catalogoActivo === false) {
      await Material.updateMany({ ferretero: ferretero.user }, { activo: false });
    }

    return NextResponse.json({ message: 'Ferretero actualizado', ferretero });
  } catch (error) {
    console.error('Error en PUT /api/ferreteros/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/ferreteros/[id]
// Elimina perfil Ferretero, sus materiales y el User asociado
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;
    const { id } = await params;

    const ferretero = await Ferretero.findById(id);
    if (!ferretero) {
      return NextResponse.json({ error: 'Ferretero no encontrado' }, { status: 404 });
    }

    await Material.deleteMany({ ferretero: ferretero.user });
    await User.findByIdAndDelete(ferretero.user);
    await Ferretero.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Ferretero eliminado correctamente' });
  } catch (error) {
    console.error('Error en DELETE /api/ferreteros/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
