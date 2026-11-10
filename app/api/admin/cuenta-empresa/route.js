// GET/PUT /api/admin/cuenta-empresa — solo admin. Cuenta donde los clientes depositan todos los pagos.
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Configuracion from '@/models/Configuracion';
import { requireSession } from '@/lib/session';
import { getCuentaEmpresa, errorCuentaEmpresa } from '@/lib/cuenta-empresa';

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;
    return NextResponse.json({ informacionPago: await getCuentaEmpresa() });
  } catch (error) {
    console.error('Error en GET admin/cuenta-empresa:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;
    const body = await request.json();
    const mensaje = errorCuentaEmpresa(body);
    if (mensaje) return NextResponse.json({ error: mensaje }, { status: 400 });
    const valor = {
      banco: body.banco.trim(),
      numeroCuenta: body.numeroCuenta.trim(),
      clabe: body.clabe.trim(),
      nombreTitular: body.nombreTitular.trim()
    };
    await Configuracion.findOneAndUpdate(
      { clave: 'cuentaEmpresa' },
      { valor, actualizadoPor: session.id },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true, informacionPago: { ...valor, configurada: true } });
  } catch (error) {
    console.error('Error en PUT admin/cuenta-empresa:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
