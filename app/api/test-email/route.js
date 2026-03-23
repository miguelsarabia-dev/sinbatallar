// app/api/test-email/route.js
// Endpoint para probar el sistema de emails
import { NextResponse } from 'next/server';
import { sendEmail, verifyEmailConnection } from '@/lib/email';
import { welcomeClienteTemplate } from '@/lib/email-templates';

export async function GET(request) {
  try {
    // Verificar conexion
    const isConnected = await verifyEmailConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo conectar al servidor de email. Verifica las credenciales.'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Conexion con servidor de email verificada correctamente',
      config: {
        user: process.env.GMAIL_USER ? 'Configurado' : 'No configurado',
        password: process.env.GMAIL_APP_PASSWORD ? 'Configurado' : 'No configurado'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { to, type } = await request.json();
    
    if (!to) {
      return NextResponse.json({
        success: false,
        error: 'El campo "to" (email destinatario) es requerido'
      }, { status: 400 });
    }
    
    // Generar template de prueba
    const html = welcomeClienteTemplate({ nombre: 'Usuario de Prueba' });
    
    // Enviar email de prueba
    const result = await sendEmail({
      to,
      subject: 'Prueba de Email - SinBatallar',
      html
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Email de prueba enviado exitosamente a ${to}`,
        messageId: result.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
