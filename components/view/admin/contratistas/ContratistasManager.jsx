"use client";
import { useState, useEffect } from 'react';
import { FaSync, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import ContratistaSearch from './ContratistaSearch';
import ContratistaTable from './ContratistaTable';
import ContratistaDetails from './ContratistaDetails';
import EditContratistaForm from './EditContratistaForm';

export default function ContratistasManager({
  onDeleteContratista,
  onUpdateContratista,
  onToggleContratistaStatus,
  serviciosDisponibles,
  showError,
  showSuccess,
  showConfirm
}) {
  const [contratistas, setContratistas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0,
    hasMore: false
  });
  const [searchParams, setSearchParams] = useState({
    search: '',
    activo: 'todos'
  });
  const [selectedContratista, setSelectedContratista] = useState(null);
  const [editingContratista, setEditingContratista] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    fetchContratistas();
  }, []);

  const fetchContratistas = async (params = searchParams, page = 1) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search: params.search,
        activo: params.activo === 'todos' ? '' : params.activo,
        page: page.toString(),
        limit: '15'
      });

      const response = await fetch(`/api/contratistas/admin-search?${queryParams}`);
      if (!response.ok) throw new Error('Error al cargar contratistas');

      const data = await response.json();
      setContratistas(data.contratistas);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching contratistas:', error);
      showError('Error al cargar contratistas');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (params) => {
    setSearchParams(params);
    fetchContratistas(params, 1);
  };

  const handleRefresh = () => {
    fetchContratistas(searchParams, pagination.page);
  };

  const handlePageChange = (newPage) => {
    fetchContratistas(searchParams, newPage);
  };

  const handleViewDetails = (contratista) => {
    setSelectedContratista(contratista);
    setShowDetails(true);
  };

  const handleEdit = (contratista) => {
    setEditingContratista(contratista);
    setShowEditForm(true);
  };

  const handleDelete = (contratistaId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar este contratista?',
      async () => {
        await onDeleteContratista(contratistaId);
        fetchContratistas(searchParams, pagination.page);
      },
      'Eliminar Contratista'
    );
  };

  const handleToggleStatus = (contratistaId, currentStatus) => {
    const action = currentStatus ? 'desactivar' : 'activar';
    showConfirm(
      `¿Estás seguro de que quieres ${action} este contratista?`,
      async () => {
        await onToggleContratistaStatus(contratistaId, currentStatus);
        fetchContratistas(searchParams, pagination.page);
      },
      `${action.charAt(0).toUpperCase() + action.slice(1)} Contratista`
    );
  };

  const handleUpdateContratista = async (contratistaData) => {
    await onUpdateContratista(contratistaData);
    setShowEditForm(false);
    setEditingContratista(null);
    fetchContratistas(searchParams, pagination.page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Contratistas</h2>
          <p className="text-sm text-gray-600 mt-1">
            {pagination.total} contratista{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <FaSync className={loading ? 'animate-spin' : ''} size={16} />
          Actualizar
        </button>
      </div>

      {/* Search */}
      <ContratistaSearch onSearch={handleSearch} loading={loading} />

      {/* Table */}
      <ContratistaTable
        contratistas={contratistas}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        loading={loading}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <FaChevronLeft size={14} />
                Anterior
              </button>

              {/* Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = index + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = index + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + index;
                  } else {
                    pageNum = pagination.page - 2 + index;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className={`px-3 py-2 rounded-lg transition-colors ${pagination.page === pageNum
                          ? 'bg-primary text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasMore || loading}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Siguiente
                <FaChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showDetails && selectedContratista && (
        <ContratistaDetails
          contratista={selectedContratista}
          onClose={() => {
            setShowDetails(false);
            setSelectedContratista(null);
          }}
        />
      )}

      {showEditForm && editingContratista && (
        <EditContratistaForm
          editingContratista={editingContratista}
          onClose={() => {
            setShowEditForm(false);
            setEditingContratista(null);
          }}
          onUpdate={handleUpdateContratista}
          serviciosDisponibles={serviciosDisponibles}
          showError={showError}
        />
      )}
    </div>
  );
}
