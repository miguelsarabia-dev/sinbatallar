import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

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
    await import('@/models/Tecnico');
  } catch (error) {
    console.error('❌ Error registrando modelos:', error);
  }
};

const HORAS_PAUSA_MAX = 48;
let ultimoMantenimiento = 0;

// Mantenimiento idempotente y barato (a lo más cada 5 min por instancia):
//  - migra cuentas anteriores: activo:true sin campo `aprobado` -> aprobado:true
//  - reactiva a los contratistas aprobados cuya pausa de disponibilidad superó las 48 h
const mantenimientoContratistas = async () => {
  if (Date.now() - ultimoMantenimiento < 5 * 60 * 1000) return;
  ultimoMantenimiento = Date.now();
  try {
    const col = mongoose.connection.collection('contratistas');
    await col.updateMany({ aprobado: { $exists: false }, activo: true }, { $set: { aprobado: true } });

    // users.email pasó a ser opcional: el índice único debe ser sparse (si no, solo cabría un usuario sin email)
    const usuarios = mongoose.connection.collection('users');
    const indices = await usuarios.indexes().catch(() => []);
    const indiceEmail = indices.find(i => i.name === 'email_1');
    if (indiceEmail && !indiceEmail.sparse) {
      await usuarios.dropIndex('email_1');
      await usuarios.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
    }
    await col.updateMany(
      { aprobado: true, activo: false, inactivoDesde: { $ne: null, $lt: new Date(Date.now() - HORAS_PAUSA_MAX * 3600 * 1000) } },
      { $set: { activo: true, inactivoDesde: null } }
    );
  } catch (error) {
    console.error('Error en mantenimiento de contratistas:', error);
  }
};

export const connectDB = async () => {
  try {
    // Validar la URI en tiempo de ejecución (no al importar el módulo),
    // para que el build de Next no falle al recolectar rutas sin env.
    if (!MONGODB_URI) {
      throw new Error('Por favor define el MONGODB_URI en las variables de entorno.')
    }

    const { connection } = await mongoose.connect(MONGODB_URI)

    if (connection.readyState === 1) {
      //console.log('MongoDB conectado')

      // Inicializar modelos después de la conexión
      await initializeModels();
      await mantenimientoContratistas();

      return Promise.resolve(true)
    }
  } catch (error) {
    console.error('Error conectando a MongoDB:', error)
    return Promise.reject(error)
  }
}

// Export por defecto para compatibilidad
export default connectDB;