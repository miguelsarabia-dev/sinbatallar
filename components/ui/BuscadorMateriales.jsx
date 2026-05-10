'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FaSearch, FaTimes, FaBoxOpen, FaPlus, FaSpinner } from 'react-icons/fa';

const UNIDAD_LABELS = {
  pieza: 'pza',
  metro: 'm',
  metro2: 'm²',
  metro3: 'm³',
  litro: 'L',
  kg: 'kg',
  caja: 'caja',
  rollo: 'rollo',
  bolsa: 'bolsa',
  par: 'par',
  juego: 'juego',
  otro: 'u',
};

/**
 * Autocomplete search component for the material catalog.
 * Props:
 *   onMaterialAgregado(material) — called when user selects a catalog item or adds manually
 *   categoriaFiltro — optional category filter string
 *   placeholder — optional input placeholder
 */
export default function BuscadorMateriales({ onMaterialAgregado, categoriaFiltro = '', placeholder = 'Buscar material en catálogo...' }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [sinResultados, setSinResultados] = useState(false);

  // Manual entry form state
  const [manual, setManual] = useState({
    nombre: '',
    cantidad: 1,
    precio: '',
    unidad: 'pieza',
  });

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const buscar = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResultados([]);
      setSinResultados(false);
      setAbierto(false);
      return;
    }

    setCargando(true);
    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (categoriaFiltro) params.set('categoria', categoriaFiltro);

      const res = await fetch(`/api/materiales/buscar?${params}`);
      if (!res.ok) throw new Error('Error en búsqueda');
      const data = await res.json();

      setResultados(Array.isArray(data) ? data : []);
      setSinResultados(Array.isArray(data) && data.length === 0);
      setAbierto(true);
    } catch {
      setResultados([]);
      setSinResultados(true);
      setAbierto(true);
    } finally {
      setCargando(false);
    }
  }, [categoriaFiltro]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => buscar(query), 300);
    } else {
      setResultados([]);
      setSinResultados(false);
      setAbierto(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, buscar]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const seleccionarMaterial = (material) => {
    onMaterialAgregado({
      nombre: material.nombre,
      descripcion: material.descripcion || '',
      cantidad: 1,
      precio: material.precio,
      unidad: material.unidad,
      total: material.precio,
      materialCatalogoId: material._id,
      _fromCatalogo: true,
    });
    setQuery('');
    setResultados([]);
    setAbierto(false);
    setSinResultados(false);
  };

  const agregarManual = () => {
    const precio = parseFloat(manual.precio) || 0;
    const cantidad = parseFloat(manual.cantidad) || 1;
    onMaterialAgregado({
      nombre: manual.nombre.trim(),
      descripcion: '',
      cantidad,
      precio,
      unidad: manual.unidad,
      total: precio * cantidad,
      materialCatalogoId: null,
      _fromCatalogo: false,
    });
    setModoManual(false);
    setManual({ nombre: '', cantidad: 1, precio: '', unidad: 'pieza' });
    setQuery('');
    setAbierto(false);
    setSinResultados(false);
  };

  const limpiar = () => {
    setQuery('');
    setResultados([]);
    setAbierto(false);
    setSinResultados(false);
    setModoManual(false);
    inputRef.current?.focus();
  };

  if (modoManual) {
    return (
      <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-secondary">Agregar material manualmente</span>
          <button
            type="button"
            onClick={() => setModoManual(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Nombre del material *"
              value={manual.nombre}
              onChange={e => setManual(p => ({ ...p, nombre: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Cantidad"
              min="0"
              step="0.01"
              value={manual.cantidad}
              onChange={e => setManual(p => ({ ...p, cantidad: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="flex">
              <span className="inline-flex items-center px-2 border border-r-0 border-gray-300 rounded-l bg-gray-50 text-gray-500 text-sm">$</span>
              <input
                type="number"
                placeholder="Precio unitario"
                min="0"
                step="0.01"
                value={manual.precio}
                onChange={e => setManual(p => ({ ...p, precio: e.target.value }))}
                className="w-full border border-gray-300 rounded-r px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <select
              value={manual.unidad}
              onChange={e => setManual(p => ({ ...p, unidad: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
            >
              {Object.entries(UNIDAD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l} — {v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setModoManual(false)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={agregarManual}
            disabled={!manual.nombre.trim()}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <FaPlus size={11} />
            Agregar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative flex items-center">
        <span className="absolute left-3 text-gray-400 pointer-events-none">
          {cargando ? <FaSpinner className="animate-spin" size={14} /> : <FaSearch size={14} />}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (resultados.length > 0 || sinResultados) setAbierto(true); }}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
        {query && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-3 text-gray-400 hover:text-gray-600"
          >
            <FaTimes size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {abierto && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto"
        >
          {resultados.length > 0 && (
            <ul>
              {resultados.map((mat) => (
                <li key={mat._id}>
                  <button
                    type="button"
                    onClick={() => seleccionarMaterial(mat)}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-9 h-9 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                      {mat.imagenUrl ? (
                        <img src={mat.imagenUrl} alt={mat.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <FaBoxOpen size={14} className="text-gray-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{mat.nombre}</span>
                        <span className="text-sm font-semibold text-primary flex-shrink-0">
                          ${mat.precio?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          <span className="text-xs text-gray-400 font-normal ml-0.5">/{UNIDAD_LABELS[mat.unidad] || mat.unidad}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {mat.marca && <span className="text-xs text-gray-500">{mat.marca}</span>}
                        {mat.marca && mat.categoria && <span className="text-gray-300 text-xs">·</span>}
                        {mat.categoria && (
                          <span className="text-xs bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-full">{mat.categoria}</span>
                        )}
                        {mat.ferretero?.nombreNegocio && (
                          <>
                            <span className="text-gray-300 text-xs">·</span>
                            <span className="text-xs text-gray-400">{mat.ferretero.nombreNegocio}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* No results footer */}
          {sinResultados && (
            <div className="px-3 py-3 text-center">
              <p className="text-sm text-gray-500 mb-2">Sin resultados para "{query}"</p>
              <button
                type="button"
                onClick={() => { setAbierto(false); setModoManual(true); }}
                className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
              >
                <FaPlus size={11} />
                Agregar manualmente
              </button>
            </div>
          )}

          {/* Always-visible manual option at bottom */}
          {resultados.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => { setAbierto(false); setModoManual(true); }}
                className="text-xs text-gray-500 hover:text-primary flex items-center gap-1"
              >
                <FaPlus size={10} />
                No está en el catálogo — agregar manualmente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual entry shortcut when query is short */}
      {!abierto && !query && (
        <button
          type="button"
          onClick={() => setModoManual(true)}
          className="mt-1.5 text-xs text-gray-400 hover:text-primary flex items-center gap-1"
        >
          <FaPlus size={10} />
          Agregar material manualmente
        </button>
      )}
    </div>
  );
}
