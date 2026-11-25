import { errorPasswordAlta, passwordEsDatoPersonal } from '@/lib/password-alta';
import { connectDB } from '@/lib/mongoose'
import Contratista from '@/models/Contratista'
import Asociado from '@/models/Asociado'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { enviarEmailBienvenidaContratista } from '@/lib/email-service'
import { requireSession, getSessionFromRequest } from '@/lib/session'
import { esObjectId, pick, soloTexto } from '@/lib/sanitize'
import { relacionCon, camposPara, asociadoDe, aplicarReglasAprobacion, SELECT_PUBLICO } from '@/lib/contratista-acceso'
import { permisoCambioZona, permisoCambioServicios } from '@/lib/datos-incorporacion'
import { validarServicios } from '@/lib/servicios-contratista'
import { validarZonas, zonasDeBody, zonasDe, sincronizarAreas } from '@/lib/zona-contratista'
import { asociadoIdDe } from '@/lib/roles'

// GET: Listar todos los contratistas o uno por ID
// Query: ?id=  ?asociadoId=  ?sinAsociado=true  ?estatus=pendiente|activo|rechazado|suspendido
export async function GET(request) {
  await connectDB();
  const { session, error } = await requireSession(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const sinAsociado = searchParams.get('sinAsociado');
  const estatus = soloTexto(searchParams.get('estatus'));

  if (id) {
    if (!esObjectId(id)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const contratista = await Contratista.findById(id)
      .populate('servicios', 'nombre descripcion categoria')
      .populate('asociado');
    if (!contratista) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (!(await relacionCon(session, contratista))) {
      const publico = await Contratista.findById(id).select(SELECT_PUBLICO).populate('servicios', 'nombre categoria');
      return NextResponse.json(publico);
    }
    return NextResponse.json(contratista);
  }

  // Listado completo: admin, o asociado (sus contratistas y los que aún no tienen asociado).
  if (!['admin', 'asociado'].includes(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const filtro = {};
  if (session.role === 'asociado') {
    const incId = await asociadoDe(session);
    if (sinAsociado === 'true') {
      filtro.$or = [{ asociado: null }, { asociado: { $exists: false } }];
    } else {
      filtro.asociado = incId;
    }
  } else {
    const asociadoId = asociadoIdDe(searchParams);
    if (esObjectId(asociadoId)) {
      filtro.asociado = asociadoId;
    } else if (sinAsociado === 'true') {
      filtro.$or = [{ asociado: null }, { asociado: { $exists: false } }];
    }
  }

  if (estatus) filtro.estatus = estatus;

  const contratistas = await Contratista.find(filtro)
    .select('-password')
    .populate('servicios', 'nombre descripcion categoria')
    .populate('asociado')
    .sort({ createdAt: -1 });

  return NextResponse.json(contratistas);
}

// POST /api/contratistas — el asociado registra un contratista
// Body JSON: { nombre, email, telefono, curp, password, asociadoId, especialidad?, direccion?, notas? }
// `password` es la contraseña temporal que el asociado le entrega al contratista (obligatoria, mín. 6).
export async function POST(req) {
  await connectDB();

  // Ya no es público (lib/policy.js): solo el asociado o el admin dan de alta contratistas.
  const session = await getSessionFromRequest(req);
  const body = await req.json();
  const { nombre, email, telefono, curp, password, especialidad, direccion, notas, servicios } = body;
  const asociadoId = asociadoIdDe(body); // la app móvil instalada aún manda incorporadorId
  for (const v of [nombre, email, telefono, curp, especialidad, direccion, notas, asociadoId]) {
    if (v !== undefined && typeof v !== 'string') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
  }
  if (asociadoId !== undefined && !esObjectId(asociadoId)) {
    return NextResponse.json({ error: 'asociadoId inválido' }, { status: 400 });
  }

  if (!nombre || !email || !telefono || !curp || !asociadoId) {
    return NextResponse.json(
      { error: 'Campos requeridos: nombre, email, telefono, curp, asociadoId' },
      { status: 400 }
    );
  }

  if (curp.trim().length !== 18) {
    return NextResponse.json({ error: 'El CURP debe tener 18 caracteres' }, { status: 400 });
  }

  // La contraseña la define quien da de alta (no se deriva del CURP): el contratista debe poder entrar con ella.
  const errorPassword = errorPasswordAlta(password);
  if (errorPassword) {
    return NextResponse.json({ error: errorPassword }, { status: 400 });
  }
  if (passwordEsDatoPersonal(password, { curp, telefono, email })) {
    return NextResponse.json({ error: 'La contraseña no puede ser igual al CURP, teléfono o correo' }, { status: 400 });
  }

  const asociado = await Asociado.findById(asociadoId);
  if (!asociado) {
    return NextResponse.json({ error: 'Asociado no encontrado' }, { status: 404 });
  }

  const existe = await Contratista.findOne({ email: email.toLowerCase().trim() });
  if (existe) {
    return NextResponse.json({ error: 'Ya existe un contratista registrado con ese email' }, { status: 409 });
  }

  const propioAsociado = session?.role === 'asociado' && String(await asociadoDe(session)) === String(asociado._id);
  const autorizadoActivar = session?.role === 'admin' || propioAsociado;

  // Zonas (máx. 5): solo las puede asignar el admin o el asociado dueño; un auto-registro no trae zonas
  let zonasAlta = { areasIds: [], areaId: null };
  const zonasPedidasAlta = zonasDeBody(body);
  if (zonasPedidasAlta !== undefined) {
    if (!autorizadoActivar) return NextResponse.json({ error: 'La zona la asigna tu asociado' }, { status: 403 });
    const zonas = await validarZonas(zonasPedidasAlta);
    if (!zonas.ok) return NextResponse.json({ error: zonas.error }, { status: zonas.status });
    zonasAlta = zonas;
  }

  // Servicios (los elige quien da de alta: admin o asociado dueño); la especialidad se deriva de ellos
  let serviciosAlta = { servicios: [], nombres: [] };
  if (servicios !== undefined) {
    if (!autorizadoActivar) return NextResponse.json({ error: 'Los servicios los asigna tu asociado' }, { status: 403 });
    const serv = await validarServicios(servicios);
    if (!serv.ok) return NextResponse.json({ error: serv.error }, { status: serv.status });
    serviciosAlta = serv;
  }

  // Contraseña temporal que dio el asociado/admin (nunca derivada del CURP)
  const passwordTemporal = await bcrypt.hash(password, 12);

  const nuevoContratista = await Contratista.create({
    nombre: nombre.trim(),
    email: email.toLowerCase().trim(),
    telefono: telefono.trim(),
    curp: curp.trim().toUpperCase(),
    especialidad: especialidad?.trim() || serviciosAlta.nombres.join(', '),
    servicios: serviciosAlta.servicios,
    direccion: direccion?.trim() || '',
    notas: notas?.trim() || '',
    password: passwordTemporal,
    asociado: asociado._id,
    areasIds: zonasAlta.areasIds,
    areaId: zonasAlta.areaId,
    // Aprobación: solo la da un admin (alta directa). Si lo crea el asociado queda en revisión hasta aprobarlo.
    aprobado: session?.role === 'admin',
    activo: session?.role === 'admin',
    estatus: 'pendiente',
  });

  enviarEmailBienvenidaContratista({ email: nuevoContratista.email, nombre: nuevoContratista.nombre })
    .catch(err => console.error('Error enviando email bienvenida contratista:', err));

  if (zonasAlta.areasIds.length) await sincronizarAreas(nuevoContratista._id, [], zonasAlta.areasIds);

  asociado.contratistasIncorporados.push(nuevoContratista._id);
  asociado.estadisticas.totalContratistasIncorporados = asociado.contratistasIncorporados.length;
  asociado.estadisticas.contratistasActivos = await Contratista.countDocuments({
    asociado: asociado._id,
    activo: true
  });
  await asociado.save();

  return NextResponse.json(
    { message: 'Contratista registrado exitosamente', contratista: { _id: nuevoContratista._id, nombre: nuevoContratista.nombre, email: nuevoContratista.email, estatus: nuevoContratista.estatus } },
    { status: 201 }
  );
}

// PUT: Actualizar un contratista existente
export async function PUT(req) {
  await connectDB();

  try {
    const { session, error } = await requireSession(req);
    if (error) return error;

    const body = await req.json();

    if (!esObjectId(body._id)) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Obtener el contratista actual para comparar cambios
    const contratistaActual = await Contratista.findById(body._id);
    if (!contratistaActual) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    // Solo admin, el propio contratista o su asociado, cada uno con sus campos permitidos
    const relacion = await relacionCon(session, contratistaActual);
    if (!relacion) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    // La zona la asigna el asociado (o el admin): si el contratista la manda, 403 explícito, no se ignora
    const permisoZona = permisoCambioZona(relacion, zonasDeBody(body));
    if (!permisoZona.ok) return NextResponse.json({ error: permisoZona.error }, { status: permisoZona.status });
    const permisoServ = permisoCambioServicios(relacion, body.servicios);
    if (!permisoServ.ok) return NextResponse.json({ error: permisoServ.error }, { status: permisoServ.status });

    let data = pick(body, camposPara(relacion));
    if (data.servicios !== undefined) {
      const serv = await validarServicios(data.servicios);
      if (!serv.ok) return NextResponse.json({ error: serv.error }, { status: serv.status });
      data.servicios = serv.servicios;
      if (data.especialidad === undefined) data.especialidad = serv.nombres.join(', '); // la especialidad se deriva de los servicios
    }
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
    if (reglas.error) return NextResponse.json({ error: reglas.error.message, ...(reglas.error.faltantes ? { faltantes: reglas.error.faltantes } : {}) }, { status: reglas.error.status });
    data = reglas.data;
    data._id = body._id;

    // Si se incluye password, hashearlo
    if (data.password !== undefined) {
      if (typeof data.password !== 'string' || data.password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
      data.password = await bcrypt.hash(data.password, 12);
    }

    const { _id: _omit, ...cambios } = data;
    const contratista = await Contratista.findByIdAndUpdate(data._id, cambios, { new: true, runValidators: true });
    if (data.areasIds !== undefined) {
      await sincronizarAreas(data._id, zonasDe(contratistaActual), data.areasIds);
    }

    // Si cambió el asociado, actualizar estadísticas
    if (data.asociado !== undefined && data.asociado !== contratistaActual.asociado?.toString()) {
      // Quitar del asociado anterior
      if (contratistaActual.asociado) {
        try {
          const asociadoAnterior = await Asociado.findById(contratistaActual.asociado);
          if (asociadoAnterior) {
            asociadoAnterior.contratistasIncorporados = asociadoAnterior.contratistasIncorporados.filter(
              id => id.toString() !== data._id
            );
            asociadoAnterior.estadisticas.totalContratistasIncorporados = asociadoAnterior.contratistasIncorporados.length;
            asociadoAnterior.estadisticas.contratistasActivos = await Contratista.countDocuments({
              asociado: contratistaActual.asociado,
              activo: true
            });
            await asociadoAnterior.save();
          }
        } catch (error) {
          console.error('Error actualizando asociado anterior:', error);
        }
      }

      // Agregar al nuevo asociado
      if (data.asociado) {
        try {
          const asociadoNuevo = await Asociado.findById(data.asociado);
          if (asociadoNuevo) {
            if (!asociadoNuevo.contratistasIncorporados.includes(data._id)) {
              asociadoNuevo.contratistasIncorporados.push(data._id);
            }
            asociadoNuevo.estadisticas.totalContratistasIncorporados = asociadoNuevo.contratistasIncorporados.length;
            asociadoNuevo.estadisticas.contratistasActivos = await Contratista.countDocuments({
              asociado: data.asociado,
              activo: true
            });
            await asociadoNuevo.save();
          }
        } catch (error) {
          console.error('Error actualizando asociado nuevo:', error);
        }
      }
    }

    // Si cambió el estado activo, actualizar estadísticas del asociado
    if (data.activo !== undefined && data.activo !== contratistaActual.activo && contratistaActual.asociado) {
      try {
        const asociado = await Asociado.findById(contratistaActual.asociado);
        if (asociado) {
          asociado.estadisticas.contratistasActivos = await Contratista.countDocuments({
            asociado: contratistaActual.asociado,
            activo: true
          });
          await asociado.save();
        }
      } catch (error) {
        console.error('Error actualizando estadísticas del asociado:', error);
      }
    }

    return NextResponse.json(contratista);
  } catch (error) {
    console.error('Error en PUT contratistas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar un contratista
export async function DELETE(req) {
  await connectDB();
  const { error } = await requireSession(req, ['admin']);
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!esObjectId(id)) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  // Obtener el contratista antes de eliminarlo
  const contratista = await Contratista.findById(id);

  if (contratista && contratista.asociado) {
    try {
      const asociado = await Asociado.findById(contratista.asociado);
      if (asociado) {
        asociado.contratistasIncorporados = asociado.contratistasIncorporados.filter(
          contratistaId => contratistaId.toString() !== id
        );
        asociado.estadisticas.totalContratistasIncorporados = asociado.contratistasIncorporados.length;
        asociado.estadisticas.contratistasActivos = await Contratista.countDocuments({
          asociado: contratista.asociado,
          activo: true
        });
        await asociado.save();
      }
    } catch (error) {
      console.error('Error actualizando estadísticas del asociado al eliminar:', error);
    }
  }

  await Contratista.findByIdAndDelete(id);
  return NextResponse.json({ message: 'Eliminado' }, { status: 200 });
}
