import { connectDB } from '@/lib/mongoose'
import Contratista from '@/models/Contratista'
import Incorporador from '@/models/Incorporador'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { enviarEmailBienvenidaContratista } from '@/lib/email-service'

// GET: Listar todos los contratistas o uno por ID
export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const incorporadorId = searchParams.get('incorporadorId');
  const sinIncorporador = searchParams.get('sinIncorporador');

  if (id) {
    const contratista = await Contratista.findById(id)
      .populate('servicios', 'nombre descripcion categoria')
      .populate('incorporador');
    if (!contratista) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(contratista);
  } else if (incorporadorId) {
    const contratistas = await Contratista.find({ incorporador: incorporadorId })
      .populate('servicios', 'nombre descripcion categoria')
      .populate('incorporador');
    return NextResponse.json(contratistas);
  } else if (sinIncorporador === 'true') {
    const contratistas = await Contratista.find({
      $or: [
        { incorporador: null },
        { incorporador: { $exists: false } }
      ]
    })
      .populate('servicios', 'nombre descripcion categoria')
      .sort({ createdAt: -1 });
    return NextResponse.json(contratistas);
  } else {
    const contratistas = await Contratista.find({})
      .populate('servicios', 'nombre descripcion categoria')
      .populate('incorporador');
    return NextResponse.json(contratistas);
  }
}

// POST /api/contratistas — el incorporador registra un contratista
// Body JSON: { nombre, email, telefono, curp, incorporadorId, especialidad?, direccion?, notas? }
export async function POST(req) {
  await connectDB();

  const { nombre, email, telefono, curp, especialidad, direccion, notas, incorporadorId } = await req.json();

  if (!nombre || !email || !telefono || !curp || !incorporadorId) {
    return NextResponse.json(
      { error: 'Campos requeridos: nombre, email, telefono, curp, incorporadorId' },
      { status: 400 }
    );
  }

  if (curp.trim().length !== 18) {
    return NextResponse.json({ error: 'El CURP debe tener 18 caracteres' }, { status: 400 });
  }

  const incorporador = await Incorporador.findById(incorporadorId);
  if (!incorporador) {
    return NextResponse.json({ error: 'Incorporador no encontrado' }, { status: 404 });
  }

<<<<<<< Updated upstream
  const nuevoContratista = new Contratista(data);
  await nuevoContratista.save();
=======
  const existe = await Contratista.findOne({ email: email.toLowerCase().trim() });
  if (existe) {
    return NextResponse.json({ error: 'Ya existe un contratista registrado con ese email' }, { status: 409 });
  }

  // Password temporal generado del CURP — el contratista lo cambia en su primer login
  const passwordTemporal = await bcrypt.hash(curp.trim().toUpperCase(), 12);
>>>>>>> Stashed changes

  const nuevoContratista = await Contratista.create({
    nombre: nombre.trim(),
    email: email.toLowerCase().trim(),
    telefono: telefono.trim(),
    curp: curp.trim().toUpperCase(),
    especialidad: especialidad?.trim() || '',
    direccion: direccion?.trim() || '',
    notas: notas?.trim() || '',
    password: passwordTemporal,
    incorporador: incorporador._id,
    activo: true,
    estatus: 'pendiente'
  });

  enviarEmailBienvenidaContratista({ email: nuevoContratista.email, nombre: nuevoContratista.nombre })
    .catch(err => console.error('Error enviando email bienvenida contratista:', err));

  incorporador.contratistasIncorporados.push(nuevoContratista._id);
  incorporador.estadisticas.totalContratistasIncorporados = incorporador.contratistasIncorporados.length;
  incorporador.estadisticas.contratistasActivos = await Contratista.countDocuments({
    incorporador: incorporador._id,
    activo: true
  });
  await incorporador.save();

  return NextResponse.json(
    { message: 'Contratista registrado exitosamente', contratista: nuevoContratista },
    { status: 201 }
  );
}

// PUT: Actualizar un contratista existente
export async function PUT(req) {
  await connectDB();

  try {
    const data = await req.json();

    if (!data._id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Obtener el contratista actual para comparar cambios
    const contratistaActual = await Contratista.findById(data._id);
    if (!contratistaActual) {
      return NextResponse.json({ error: 'Contratista no encontrado' }, { status: 404 });
    }

    // Si se incluye password, hashearlo
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    }

    const contratista = await Contratista.findByIdAndUpdate(data._id, data, { new: true });

    // Si cambió el incorporador, actualizar estadísticas
    if (data.incorporador !== undefined && data.incorporador !== contratistaActual.incorporador?.toString()) {
      // Quitar del incorporador anterior
      if (contratistaActual.incorporador) {
        try {
          const incorporadorAnterior = await Incorporador.findById(contratistaActual.incorporador);
          if (incorporadorAnterior) {
            incorporadorAnterior.contratistasIncorporados = incorporadorAnterior.contratistasIncorporados.filter(
              id => id.toString() !== data._id
            );
            incorporadorAnterior.estadisticas.totalContratistasIncorporados = incorporadorAnterior.contratistasIncorporados.length;
            incorporadorAnterior.estadisticas.contratistasActivos = await Contratista.countDocuments({
              incorporador: contratistaActual.incorporador,
              activo: true
            });
            await incorporadorAnterior.save();
          }
        } catch (error) {
          console.error('Error actualizando incorporador anterior:', error);
        }
      }

      // Agregar al nuevo incorporador
      if (data.incorporador) {
        try {
          const incorporadorNuevo = await Incorporador.findById(data.incorporador);
          if (incorporadorNuevo) {
            if (!incorporadorNuevo.contratistasIncorporados.includes(data._id)) {
              incorporadorNuevo.contratistasIncorporados.push(data._id);
            }
            incorporadorNuevo.estadisticas.totalContratistasIncorporados = incorporadorNuevo.contratistasIncorporados.length;
            incorporadorNuevo.estadisticas.contratistasActivos = await Contratista.countDocuments({
              incorporador: data.incorporador,
              activo: true
            });
            await incorporadorNuevo.save();
          }
        } catch (error) {
          console.error('Error actualizando incorporador nuevo:', error);
        }
      }
    }

    // Si cambió el estado activo, actualizar estadísticas del incorporador
    if (data.activo !== undefined && data.activo !== contratistaActual.activo && contratistaActual.incorporador) {
      try {
        const incorporador = await Incorporador.findById(contratistaActual.incorporador);
        if (incorporador) {
          incorporador.estadisticas.contratistasActivos = await Contratista.countDocuments({
            incorporador: contratistaActual.incorporador,
            activo: true
          });
          await incorporador.save();
        }
      } catch (error) {
        console.error('Error actualizando estadísticas del incorporador:', error);
      }
    }

    return NextResponse.json(contratista);
  } catch (error) {
    console.error('Error en PUT contratistas:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un contratista
export async function DELETE(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  // Obtener el contratista antes de eliminarlo
  const contratista = await Contratista.findById(id);

  if (contratista && contratista.incorporador) {
    try {
      const incorporador = await Incorporador.findById(contratista.incorporador);
      if (incorporador) {
        incorporador.contratistasIncorporados = incorporador.contratistasIncorporados.filter(
          contratistaId => contratistaId.toString() !== id
        );
        incorporador.estadisticas.totalContratistasIncorporados = incorporador.contratistasIncorporados.length;
        incorporador.estadisticas.contratistasActivos = await Contratista.countDocuments({
          incorporador: contratista.incorporador,
          activo: true
        });
        await incorporador.save();
      }
    } catch (error) {
      console.error('Error actualizando estadísticas del incorporador al eliminar:', error);
    }
  }

  await Contratista.findByIdAndDelete(id);
  return NextResponse.json({ message: 'Eliminado' }, { status: 200 });
}
