// lib/campos-contratista.js
// Qué campos de un Contratista puede editar cada relación (puro, para poder probarlo). Evita el mass-assignment.

// Perfil que edita el propio contratista (la zona `areaId` NO está aquí: la asigna el incorporador o el admin)
export const CAMPOS_PROPIOS = ['nombre', 'telefono', 'direccion', 'especialidad', 'notas', 'servicios', 'ubicacion', 'password', 'activo'];
// Lo que decide el incorporador dueño (datos escritos, zona y aprobación de sus contratistas)
export const CAMPOS_INCORPORADOR = ['aprobado', 'estatus', 'notas', 'curp', 'direccion', 'telefono', 'especialidad', 'areaId', 'areasIds'];
// Solo admin
export const CAMPOS_ADMIN = [...CAMPOS_PROPIOS, 'email', 'curp', 'aprobado', 'estatus', 'incorporador', 'areaId', 'areasIds'];
