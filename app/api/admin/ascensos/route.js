// POST /api/admin/ascensos — solo admin.
// Registra que un especialista o aspirante aprobó el examen de la empresa (se aplica fuera de la app) y le da el rol
// de contratista (modelo permanente). Se crea su Contratista con la MISMA cuenta (correo, teléfono y contraseña) y su
// perfil del modelo inicial queda inactivo con el registro del ascenso; su historial se conserva.
// Body: { rol: 'especialista' | 'aspirante', perfilId }
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Especialista from '@/models/Especialista';
import Aspirante from '@/models/Aspirante';
import Contratista from '@/models/Contratista';
import User from '@/models/User';
import { requireSession } from '@/lib/session';
import { esObjectId } from '@/lib/sanitize';
import { planAscenso } from '@/lib/inicial-cuentas';
import { sincronizarAreas } from '@/lib/zona-contratista';

export async function POST(request) {
  try {
    await connectDB();
    const { session, error } = await requireSession(request, ['admin']);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const { rol, perfilId } = body;
    if (!['especialista', 'aspirante'].includes(rol)) {
      return NextResponse.json({ error: 'rol debe ser especialista o aspirante' }, { status: 400 });
    }
    if (!esObjectId(perfilId)) return NextResponse.json({ error: 'perfilId inválido' }, { status: 400 });

    const Modelo = rol === 'especialista' ? Especialista : Aspirante;
    const perfil = await Modelo.findById(perfilId).lean();
    const user = perfil ? await User.findById(perfil.user).lean() : null;
    const especialista = rol === 'aspirante' && perfil ? await Especialista.findById(perfil.especialista).lean() : null;

    const plan = planAscenso({ rol, perfil, user, especialista });
    if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.status });

    if (await Contratista.exists({ email: plan.contratista.email })) {
      return NextResponse.json({ error: 'Ya existe un contratista con ese correo' }, { status: 409 });
    }

    const contratista = await Contratista.create(plan.contratista);
    if (plan.contratista.areasIds.length) await sincronizarAreas(contratista._id, [], plan.contratista.areasIds);

    const fecha = plan.contratista.origen.fecha;
    await Modelo.updateOne(
      { _id: perfil._id },
      { $set: { activo: false, ascenso: { fecha, contratista: contratista._id, registradoPor: session.id } } }
    );

    // Si asciende un especialista, sus aspirantes activos se quedan sin instructor: se avisa al admin para reasignarlos
    const aspirantesPorReasignar = rol === 'especialista'
      ? await Aspirante.countDocuments({ especialista: perfil._id, activo: true })
      : 0;

    return NextResponse.json({
      message: 'Ascenso registrado: la cuenta ya puede entrar como contratista con el mismo correo y contraseña',
      contratista: { _id: contratista._id, nombre: contratista.nombre, email: contratista.email },
      aspirantesPorReasignar
    }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /admin/ascensos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
