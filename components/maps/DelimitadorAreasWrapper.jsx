"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';

// Importar DelimitadorAreas dinámicamente para evitar problemas de SSR
const DelimitadorAreasDynamic = dynamic(
  () => import('./DelimitadorAreasFixed'),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    )
  }
);

const DelimitadorAreasWrapper = ({ onAreaConfirmada, onCancel, areasExistentes = [], hideContratistas = false, aperturadorId = null }) => {
  return (
    <DelimitadorAreasDynamic
      onAreaConfirmada={onAreaConfirmada}
      onCancel={onCancel}
      areasExistentes={areasExistentes}
      hideContratistas={hideContratistas}
      aperturadorId={aperturadorId}
    />
  );
};

export default DelimitadorAreasWrapper;
