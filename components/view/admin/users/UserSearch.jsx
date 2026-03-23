"use client";
import { useState } from 'react';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

export default function UserSearch({ onSearch, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);

  const roles = [
    { value: 'todos', label: 'Todos los roles' },
    { value: 'cliente', label: 'Cliente' },
    { value: 'admin', label: 'Admin' },
    { value: 'aperturador', label: 'Aperturador' },
    { value: 'incorporador', label: 'Incorporador' }
  ];

  const handleSearch = () => {
    onSearch({ search: searchTerm, role: selectedRole });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedRole('todos');
    onSearch({ search: '', role: 'todos' });
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Campo de búsqueda */}
        <div className="flex-1 relative">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Botón de filtros en móvil */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <FaFilter size={14} />
          Filtros
        </button>

        {/* Selector de rol en desktop */}
        <div className="hidden md:block">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            disabled={loading}
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botón de búsqueda */}
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Buscando...
            </>
          ) : (
            <>
              <FaSearch size={14} />
              Buscar
            </>
          )}
        </button>

        {/* Botón limpiar */}
        {(searchTerm || selectedRole !== 'todos') && (
          <button
            onClick={handleClearSearch}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Filtros móviles */}
      {showFilters && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por rol
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            disabled={loading}
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
