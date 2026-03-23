// components/ui/CalificacionBadge.jsx
import React from 'react';

const CalificacionBadge = ({ calificacion, size = 'sm', showText = true }) => {
  const getCalificacionStyle = (nivel) => {
    switch (nivel) {
      case 'A':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200',
          label: 'Excelente'
        };
      case 'B':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-200',
          label: 'Bueno'
        };
      case 'C':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-200',
          label: 'Regular'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          label: 'Sin calificar'
        };
    }
  };

  const getSizeClasses = (size) => {
    switch (size) {
      case 'xs':
        return 'px-1 py-0.5 text-xs';
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-1 text-sm';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  const styles = getCalificacionStyle(calificacion);
  const sizeClasses = getSizeClasses(size);

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium border
        ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses}
      `}
    >
      {calificacion || 'N/A'}
      {showText && calificacion && (
        <span className="ml-1">- {styles.label}</span>
      )}
    </span>
  );
};

export default CalificacionBadge;
