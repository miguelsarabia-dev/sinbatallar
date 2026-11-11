// lib/campos-contratista.js
// Qué campos de un Contratista puede editar cada relación (puro, para poder probarlo). Evita el mass-assignment.

// Perfil que edita el propio contratista (ni la zona ni los servicios/especialidad están aquí: los asigna el incorporador o el admin)
export const CAMPOS_PROPIOS = ['nombre', 'telefono', 'direccion', 'notas', 'ubicacion', 'password', 'activo'];
// Lo que decide el incorporador dueño (datos escritos, zona y aprobación de sus contratistas)
export const CAMPOS_INCORPORADOR = ['aprobado', 'estatus', 'notas', 'curp', 'direccion', 'telefono', 'especialidad', 'servicios', 'areaId', 'areasIds'];
// Solo admin
export const CAMPOS_ADMIN = [...CAMPOS_PROPIOS, 'email', 'curp', 'aprobado', 'estatus', 'incorporador', 'especialidad', 'servicios', 'areaId', 'areasIds'];
