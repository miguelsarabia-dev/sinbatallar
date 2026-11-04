// app/api/contratistas/[id]/pago/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Contratista from '@/models/Contratista';
import Cita from '@/models/Cita';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';

// GET - Obtener información de pago del contratista
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request);
    if (error) return error;

    const { id } = await params;
    if (!esObjectId(id)) return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });

    // Datos bancarios: el propio contratista, admin, o un cliente que tenga una cita con él.
    const esPropio = session.role === 'contratista' && session.id === id;
    if (!esPropio && session.role !== 'admin') {
      const relacionado = session.role === 'cliente' && await Cita.exists({ cliente: session.id, contratista: id });
      if (!relacionado) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const contratista = await Contratista.findById(id)
      .select('informacionPago nombre email');

    if (!contratista) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    // Verificar que el usuario autenticado sea el contratista


    return NextResponse.json({
      informacionPago: contratista.informacionPago || {
        banco: '',
        numeroCuenta: '',
        clabe: '',
        nombreTitular: '',
        actualizado: null
      }
    });

  } catch (error) {
    console.error('Error al obtener información de pago:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// PUT - Actualizar información de pago del contratista
export async function PUT(request, { params }) {
  try {
    await connectDB();



    const { id } = await params;
    const { banco, numeroCuenta, clabe, nombreTitular } = await request.json();

    // Validaciones básicas
    if (!banco?.trim() || !numeroCuenta?.trim() || !clabe?.trim() || !nombreTitular?.trim()) {
      return NextResponse.json({
        error: 'Todos los campos son obligatorios'
      }, { status: 400 });
    }

    // Validar formato de CLABE (18 dígitos)
    if (!/^\d{18}$/.test(clabe.trim())) {
      return NextResponse.json({
        error: 'La CLABE debe tener 18 dígitos numéricos'
      }, { status: 400 });
    }

    // Validar que el número de cuenta sea numérico
    if (!/^\d+$/.test(numeroCuenta.trim())) {
      return NextResponse.json({
        error: 'El número de cuenta debe ser numérico'
      }, { status: 400 });
    }

    const contratista = await Contratista.findById(id);

    if (!contratista) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    // Verificar que el usuario autenticado sea el contratista


    // Actualizar información de pago
    const contratistaActualizado = await Contratista.findByIdAndUpdate(
      id,
      {
        informacionPago: {
          banco: banco.trim(),
          numeroCuenta: numeroCuenta.trim(),
          clabe: clabe.trim(),
          nombreTitular: nombreTitular.trim(),
          actualizado: new Date()
        }
      },
      { new: true, select: 'informacionPago nombre email' }
    );

    return NextResponse.json({
      message: 'Información de pago actualizada exitosamente',
      informacionPago: contratistaActualizado.informacionPago
    });

  } catch (error) {
    console.error('Error al actualizar información de pago:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}