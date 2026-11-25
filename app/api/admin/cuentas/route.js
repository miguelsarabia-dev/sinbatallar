// /api/admin/cuentas — solo admin. Da de alta cuentas de CUALQUIER rol (las reglas puras están en lib/admin-cuentas.js).
//   GET  → { roles, contratistas, especialistas, asociados } para llenar el formulario
//   POST { rol, nombre, email, telefono, password, contratistaId?, especialistaId?, asociadoId?, nombreNegocio? }
// Las cuentas que crea el admin quedan aprobadas y activas. El correo no puede repetirse ni entre usuarios ni entre
// contratistas (el login detecta el rol por correo y contraseña).
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { requireSession } from '@/lib/session';
import { hashPassword } from '@/lib/auth';
import { ROLES_ALTA_ADMIN, validarAltaAdmin } from '@/lib/admin-cuentas';
import { crearCuentaConPerfil } from '@/lib/inicial-db';
import User from '@/models/User';
import Contratista from '@/models/Contratista';
import Tecnico from '@/models/Tecnico';
import Ferretero from '@/models/Ferretero';
import Aperturador from '@/models/Aperturador';
import Asociado from '@/models/Asociado';
import Especialista from '@/models/Especialista';
import Aspirante from '@/models/Aspirante';

const conNombre = (perfiles) => perfiles.map(p => ({ _id: p._id, nombre: p.user?.nombre || p.nombre || '—', email: p.user?.email || p.email }));

export async function GET(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;
    const [contratistas, especialistas, asociados] = await Promise.all([
      Contratista.find({ suspendido: { $ne: true } }).select('nombre email').sort({ nombre: 1 }).lean(),
      Especialista.find({ activo: true }).populate('user', 'nombre email').lean(),
      Asociado.find({ activo: { $ne: false } }).populate('user', 'nombre email').lean(),
    ]);
    return NextResponse.json({
      roles: ROLES_ALTA_ADMIN,
      contratistas: conNombre(contratistas),
      especialistas: conNombre(especialistas),
      asociados: conNombre(asociados),
    });
  } catch (error) {
    console.error('Error en GET /admin/cuentas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { error } = await requireSession(request, ['admin']);
    if (error) return error;

    const v = validarAltaAdmin(await request.json().catch(() => ({})));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const { rol, datos, relacion } = v;

    if ((await User.exists({ email: datos.email })) || (await Contratista.exists({ email: datos.email }))) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 });
    }

    // La cuenta relacionada debe existir
    const Relacionado = { contratistaId: Contratista, especialistaId: Especialista, asociadoId: Asociado }[relacion?.campo];
    if (Relacionado && !(await Relacionado.exists({ _id: relacion.id }))) {
      return NextResponse.json({ error: 'La cuenta relacionada no existe' }, { status: 400 });
    }

    if (rol === 'contratista') {
      const c = await Contratista.create({
        nombre: datos.nombre,
        email: datos.email,
        telefono: datos.telefono,
        password: await hashPassword(datos.password),
        asociado: relacion?.id || null,
        aprobado: true,
        activo: true,
        estatus: 'activo',
      });
      if (relacion) {
        await Asociado.updateOne({ _id: relacion.id }, { $addToSet: { contratistasIncorporados: c._id } });
      }
      return NextResponse.json({ ok: true, cuenta: { _id: c._id, nombre: c.nombre, email: c.email, rol } }, { status: 201 });
    }

    if (rol === 'cliente' || rol === 'admin') {
      const u = await User.create({ ...datos, password: await hashPassword(datos.password), role: rol });
      return NextResponse.json({ ok: true, cuenta: { _id: u._id, nombre: u.nombre, email: u.email, rol } }, { status: 201 });
    }

    const perfiles = {
      aperturador: [Aperturador, {}],
      asociado: [Asociado, {}],
      tecnico: [Tecnico, { contratista: relacion?.id, activo: true }],
      // Sin ubicación todavía: null (un { type: 'Point' } sin coordenadas rompe el índice 2dsphere)
      ferretero: [Ferretero, { nombreNegocio: v.nombreNegocio, telefono: datos.telefono, ubicacion: null, activo: true, pendienteAprobacion: false }],
      especialista: [Especialista, { asociado: relacion?.id || null, aprobado: true, activo: true }],
      aspirante: [Aspirante, { especialista: relacion?.id, activo: true }],
    };
    const [Modelo, perfil] = perfiles[rol];
    const r = await crearCuentaConPerfil({ datos, role: rol, Modelo, perfil });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true, cuenta: { _id: r.user._id, nombre: r.user.nombre, email: r.user.email, rol } }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 });
    console.error('Error en POST /admin/cuentas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
