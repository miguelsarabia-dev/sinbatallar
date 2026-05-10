import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Por favor define el MONGODB_URI en las variables de entorno.')
}

// Función para inicializar todos los modelos
const initializeModels = async () => {
  try {
    // Importar todos los modelos para asegurar que estén registrados
    await import('@/models/User');
    await import('@/models/Contratista');
    await import('@/models/Servicio');
    await import('@/models/Cita');
    await import('@/models/Cotizacion');
    await import('@/models/Material');
    await import('@/models/Ferretero');
  } catch (error) {
    console.error('❌ Error registrando modelos:', error);
  }
};

export const connectDB = async () => {
  try {
    const { connection } = await mongoose.connect(MONGODB_URI)

    if (connection.readyState === 1) {
      //console.log('MongoDB conectado')

      // Inicializar modelos después de la conexión
      await initializeModels();

      return Promise.resolve(true)
    }
  } catch (error) {
    console.error('Error conectando a MongoDB:', error)
    return Promise.reject(error)
  }
}

// Export por defecto para compatibilidad
export default connectDB;