import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import { NextResponse } from 'next/server';

// GET: Buscar usuarios por email o teléfono
export async function GET(request) {
  await connectDB();
  
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const telefono = searchParams.get('telefono');
    
    if (!email && !telefono) {
      return NextResponse.json({ 
        error: 'Debe proporcionar al menos un email o teléfono' 
      }, { status: 400 });
    }
    
    // Construir query de búsqueda
    const query = {};
    if (email && telefono) {
      // Buscar por email O teléfono
      query.$or = [
        { email: email.toLowerCase() },
        { telefono: telefono }
      ];
    } else if (email) {
      query.email = email.toLowerCase();
    } else if (telefono) {
      query.telefono = telefono;
    }
    
    const user = await User.findOne(query).select('-password');
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado' 
      }, { status: 404 });
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error en búsqueda de usuario:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
