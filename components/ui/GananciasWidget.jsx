import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaChartLine, FaArrowUp, FaCalendarAlt, FaWrench, FaBox } from 'react-icons/fa';

const GananciasWidget = ({ userId, role = 'contratista' }) => {
  const [ganancias, setGanancias] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchGanancias();
    }
  }, [userId, periodo]);

  const fetchGanancias = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ganancias?userId=${userId}&role=${role}&periodo=${periodo}`);

      if (response.ok) {
        const data = await response.json();
        setGanancias(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar ganancias');
      }
    } catch (error) {
      console.error('Error fetching ganancias:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg md:rounded-2xl shadow-lg p-4 animate-pulse">
        <div className="h-6 bg-neutral rounded mb-3"></div>
        <div className="h-8 bg-neutral rounded mb-2"></div>
        <div className="h-4 bg-neutral rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg md:rounded-2xl shadow-lg p-4">
        <div className="flex items-center text-error">
          <FaMoneyBillWave className="mr-2 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!ganancias || !ganancias.success) {
    return (
      <div className="bg-white rounded-lg md:rounded-2xl shadow-lg p-4">
        <div className="flex items-center text-muted">
          <FaMoneyBillWave className="mr-2 flex-shrink-0" />
          <span className="text-sm">Sin datos de ganancias</span>
        </div>
      </div>
    );
  }

  const { resumen, desgloseCostos, gananciasPorCategoria } = ganancias;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-sm md:text-base font-semibold text-secondary flex items-center gap-2 min-w-0">
          <FaMoneyBillWave className="text-primary flex-shrink-0 text-base md:text-lg" />
          <span className="truncate">Ganancias</span>
        </h3>

        {/* Selector de período */}
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-2 py-1 border-2 border-neutral rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white text-foreground flex-shrink-0"
        >
          <option value="dia">Hoy</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
          <option value="año">Año</option>
        </select>
      </div>

      {/* Resumen Principal */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-success/10 rounded-lg p-2 text-center">
          <div className="text-base md:text-xl font-bold text-success truncate">
            ${resumen.totalGanancias.toFixed(0)}
          </div>
          <div className="text-xs text-success truncate">Total</div>
        </div>

        <div className="bg-accent/10 rounded-lg p-2 text-center">
          <div className="text-base md:text-xl font-bold text-accent">
            {resumen.totalServicios}
          </div>
          <div className="text-xs text-accent-dark truncate">Trabajos</div>
        </div>

        <div className="bg-secondary/10 rounded-lg p-2 text-center">
          <div className="text-base md:text-xl font-bold text-secondary truncate">
            ${resumen.gananciaPromedio.toFixed(0)}
          </div>
          <div className="text-xs text-secondary-light truncate">Prom.</div>
        </div>
      </div>

      {/* Desglose de Costos (solo para contratistas) */}
      {role === 'contratista' && desgloseCostos && (
        <div className="mb-4">
          <h4 className="text-xs md:text-sm font-semibold text-secondary mb-2">Desglose</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-light rounded-lg p-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <FaBox className="text-primary flex-shrink-0 text-xs" />
                  <span className="text-xs text-foreground truncate">Materiales</span>
                </div>
                <span className="font-semibold text-primary text-xs truncate">
                  ${desgloseCostos.totalMateriales.toFixed(0)}
                </span>
              </div>
            </div>

            <div className="bg-neutral-light rounded-lg p-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <FaWrench className="text-accent flex-shrink-0 text-xs" />
                  <span className="text-xs text-foreground truncate">M. Obra</span>
                </div>
                <span className="font-semibold text-accent text-xs truncate">
                  ${desgloseCostos.gananciasManoObra.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ganancias por Categoría */}
      {Object.keys(gananciasPorCategoria).length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs md:text-sm font-semibold text-secondary mb-2">Categorías</h4>
          <div className="space-y-1.5">
            {Object.entries(gananciasPorCategoria)
              .sort(([, a], [, b]) => b.total - a.total)
              .slice(0, 3)
              .map(([categoria, datos]) => (
                <div key={categoria} className="flex items-center justify-between py-1.5 px-2 bg-neutral-light rounded">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-xs font-medium text-foreground truncate block">{categoria}</span>
                    <span className="text-xs text-muted truncate block">({datos.servicios})</span>
                  </div>
                  <span className="font-semibold text-secondary text-xs flex-shrink-0">
                    ${datos.total.toFixed(0)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Servicios Recientes */}
      {ganancias.serviciosRecientes && ganancias.serviciosRecientes.length > 0 && (
        <div>
          <h4 className="text-xs md:text-sm font-semibold text-secondary mb-2 flex items-center gap-1">
            <FaChartLine className="flex-shrink-0" />
            Recientes
          </h4>
          <div className="space-y-1.5">
            {ganancias.serviciosRecientes.slice(0, 3).map((servicio, index) => (
              <div key={servicio._id} className="flex items-center justify-between py-1.5 px-2 bg-neutral-light rounded text-xs">
                <div className="min-w-0 flex-1 mr-2">
                  <div className="font-medium text-foreground truncate">{servicio.cliente}</div>
                  <div className="text-xs text-muted truncate">{servicio.servicio}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-success text-xs">
                    +${servicio.ganancia.toFixed(0)}
                  </div>
                  <div className="text-xs text-muted whitespace-nowrap">
                    {new Date(servicio.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información de período */}
      <div className="mt-3 pt-2 border-t border-neutral">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="truncate">{getPeriodoLabel(periodo)}</span>
          <span className="flex items-center gap-1 flex-shrink-0 ml-2">
            <FaArrowUp className="flex-shrink-0" />
            <span className="hidden sm:inline">Actualizado</span>
          </span>
        </div>
      </div>
    </div>
  );
};

const getPeriodoLabel = (periodo) => {
  switch (periodo) {
    case 'dia': return 'Hoy';
    case 'semana': return 'Últimos 7 días';
    case 'mes': return 'Último mes';
    case 'año': return 'Último año';
    default: return 'Período seleccionado';
  }
};

export default GananciasWidget;
