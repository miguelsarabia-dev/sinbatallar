// lib/date-utils.js

/**
 * Formatea una fecha de manera segura
 * @param {string|Date|null|undefined} dateValue - Valor de fecha a formatear
 * @param {string} defaultValue - Valor por defecto si la fecha no es válida
 * @returns {string} Fecha formateada o valor por defecto
 */
export function formatDate(dateValue, defaultValue = 'Sin fecha') {
  if (!dateValue) return defaultValue;
  
  try {
    const date = new Date(dateValue);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return defaultValue;
    }
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.warn('Error formateando fecha:', dateValue, error);
    return defaultValue;
  }
}

/**
 * Formatea una fecha con hora de manera segura
 * @param {string|Date|null|undefined} dateValue - Valor de fecha a formatear
 * @param {string} timeValue - Valor de hora (opcional)
 * @param {string} defaultValue - Valor por defecto si la fecha no es válida
 * @returns {string} Fecha y hora formateada o valor por defecto
 */
export function formatDateTime(dateValue, timeValue = null, defaultValue = 'Sin programar') {
  if (!dateValue) return defaultValue;
  
  try {
    const date = new Date(dateValue);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return defaultValue;
    }
    
    const formattedDate = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Si hay hora, agregarla
    if (timeValue) {
      return `${formattedDate} ${timeValue}`;
    }
    
    return formattedDate;
  } catch (error) {
    console.warn('Error formateando fecha y hora:', dateValue, timeValue, error);
    return defaultValue;
  }
}

/**
 * Verifica si una fecha es válida
 * @param {string|Date|null|undefined} dateValue - Valor de fecha a verificar
 * @returns {boolean} True si es válida, false en caso contrario
 */
export function isValidDate(dateValue) {
  if (!dateValue) return false;
  
  try {
    const date = new Date(dateValue);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
}

/**
 * Convierte una fecha a formato ISO string de manera segura
 * @param {string|Date|null|undefined} dateValue - Valor de fecha a convertir
 * @returns {string|null} ISO string o null si no es válida
 */
export function toISOString(dateValue) {
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.warn('Error convirtiendo a ISO string:', dateValue, error);
    return null;
  }
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD para inputs de fecha
 * @returns {string} Fecha actual en formato YYYY-MM-DD
 */
export function getCurrentDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Convierte fecha y hora separadas en un objeto Date
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @param {string} timeString - Hora en formato HH:MM
 * @returns {Date|null} Objeto Date o null si no es válida
 */
export function combineDateTime(dateString, timeString) {
  if (!dateString) return null;
  
  try {
    const dateTime = timeString ? `${dateString}T${timeString}` : dateString;
    const date = new Date(dateTime);
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn('Error combinando fecha y hora:', dateString, timeString, error);
    return null;
  }
}
