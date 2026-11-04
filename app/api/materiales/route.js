// app/api/materiales/route.js
import { NextResponse } from 'next/server';
import { requireSession, getSessionFromRequest } from '@/lib/session';
import { esObjectId, pick } from '@/lib/sanitize';
import { parseStock } from '@/lib/stock';

import { connectDB } from '@/lib/mongoose';
import Material from '@/models/Material';
import Ferretero from '@/models/Ferretero';

// GET /api/materiales
// Query: ?ferreteroUserId=  ?categoria=  ?soloActivos=true
export async function GET(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const ferreteroUserId = esObjectId(searchParams.get('ferreteroUserId')) ? searchParams.get('ferreteroUserId') : null;
    const categoria = searchParams.get('categoria');
    // Ver materiales inactivos: solo el dueño del catálogo o admin
    const veInactivos = session.role === 'admin' || (session.role === 'ferretero' && session.id === ferreteroUserId);
    const soloActivos = searchParams.get('soloActivos') !== 'false' || !veInactivos;

    const filtro = {};

    if (ferreteroUserId) {
      filtro.ferretero = ferreteroUserId;
    } else {
      // Sin filtro de ferretero → solo mostrar materiales de catálogos activos
      const ferreterosActivos = await Ferretero.find({ activo: true, catalogoActivo: true }).select('user');
      const userIds = ferreterosActivos.map(f => f.user);
      filtro.ferretero = { $in: userIds };
    }

    if (soloActivos) filtro.activo = true;
    if (typeof categoria === 'string' && categoria) filtro.categoria = categoria;

    const materiales = await Material.find(filtro)
      .populate('ferretero', 'nombre')
      .sort({ categoria: 1, nombre: 1 })
      .lean();

    // Datos de la ferretería de cada material (para recoger/contactar): teléfono, dirección, ubicación GeoJSON y horario
    const userIds = [...new Set(materiales.map(m => String(m.ferretero?._id || m.ferretero)))];
    const ferreterias = await Ferretero.find({ user: { $in: userIds } }).select('user nombreNegocio telefono direccion ubicacion horario').lean();
    const porUser = Object.fromEntries(ferreterias.map(f => [String(f.user), f]));

    return NextResponse.json(materiales.map(m => {
      const f = porUser[String(m.ferretero?._id || m.ferretero)];
      return {
        ...m,
        stock: m.stock ?? null,
        ferreteria: f ? { _id: f._id, nombreNegocio: f.nombreNegocio, telefono: f.telefono, direccion: f.direccion, ubicacion: f.ubicacion, horario: f.horario } : null
      };
    }));
  } catch (error) {
    console.error('Error en GET /api/materiales:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/materiales
// Body: { nombre, descripcion, categoria, marca, unidad, precio, stock?, ferreteroUserId, imagenUrl, imagenPublicId }
export async function POST(request) {
  try {
    await connectDB();

    const { session, error } = await requireSession(request, ['ferretero', 'admin']);
    if (error) return error;

    const body = await request.json();
    const { nombre, categoria, unidad, precio } = body;
    // El material se crea para el ferretero del token (admin: el del body)
    const ferreteroUserId = session.role === 'ferretero' ? session.id : body.ferreteroUserId;
    for (const v of [nombre, categoria, unidad, body.descripcion, body.marca, body.imagenUrl, body.imagenPublicId]) {
      if (v !== undefined && typeof v !== 'string') {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
      }
    }

    if (!nombre || !categoria || !unidad || precio === undefined || !ferreteroUserId) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, categoria, unidad, precio, ferreteroUserId' },
        { status: 400 }
      );
    }

    if (precio < 0) {
      return NextResponse.json({ error: 'El precio no puede ser negativo' }, { status: 400 });
    }

    // stock: entero >= 0 se controla; vacío/null = sin control
    const stock = parseStock(body.stock);
    if (!stock.ok) return NextResponse.json({ error: stock.error }, { status: 400 });

    const material = await Material.create({
      nombre: body.nombre,
      descripcion: body.descripcion || '',
      categoria: body.categoria,
      marca: body.marca || '',
      unidad: body.unidad,
      precio: parseFloat(body.precio),
      imagenUrl: body.imagenUrl || '',
      imagenPublicId: body.imagenPublicId || '',
      stock: stock.definido ? stock.valor : null,
      ferretero: ferreteroUserId
    });

    return NextResponse.json(
      { message: 'Material creado exitosamente', material },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error en POST /api/materiales:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
