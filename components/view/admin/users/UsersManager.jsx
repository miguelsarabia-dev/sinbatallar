"use client";
import { useState, useEffect } from 'react';
import { FaSync, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import UserSearch from './UserSearch';
import UserTable from './UserTable';
import UserDetails from './UserDetails';
import EditUserForm from './EditUserForm';

export default function UsersManager({ 
  onDeleteUser, 
  onUpdateUser, 
  onConvertToAperturador, 
  onConvertToIncorporador,
  showError,
  showSuccess,
  showConfirm
}) {
  const [users, setUsers] = useState([]);
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
    role: 'todos'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (params = searchParams, page = 1) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search: params.search,
        role: params.role,
        page: page.toString(),
        limit: '15'
      });

      const response = await fetch(`/api/users/admin-search?${queryParams}`);
      if (!response.ok) throw new Error('Error al cargar usuarios');
      
      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (params) => {
    setSearchParams(params);
    fetchUsers(params, 1);
  };

  const handleRefresh = () => {
    fetchUsers(searchParams, pagination.page);
  };

  const handlePageChange = (newPage) => {
    fetchUsers(searchParams, newPage);
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowEditForm(true);
  };

  const handleDelete = (userId) => {
    showConfirm(
      '¿Estás seguro de que quieres eliminar este usuario?',
      async () => {
        await onDeleteUser(userId);
        fetchUsers(searchParams, pagination.page);
      },
      'Eliminar Usuario'
    );
  };

  const handleUpdateUser = async (userData) => {
    await onUpdateUser(userData);
    setShowEditForm(false);
    setEditingUser(null);
    fetchUsers(searchParams, pagination.page);
  };

  const handleConvertToAperturador = async (userId) => {
    await onConvertToAperturador(userId);
    fetchUsers(searchParams, pagination.page);
  };

  const handleConvertToIncorporador = async (userId) => {
    await onConvertToIncorporador(userId);
    fetchUsers(searchParams, pagination.page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-sm text-gray-600 mt-1">
            {pagination.total} usuario{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
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
      <UserSearch onSearch={handleSearch} loading={loading} />

      {/* Table */}
      <UserTable
        users={users}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        pagination.page === pageNum
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
      {showDetails && selectedUser && (
        <UserDetails
          user={selectedUser}
          onClose={() => {
            setShowDetails(false);
            setSelectedUser(null);
          }}
        />
      )}

      {showEditForm && editingUser && (
        <EditUserForm
          editingUser={editingUser}
          onClose={() => {
            setShowEditForm(false);
            setEditingUser(null);
          }}
          onUpdate={handleUpdateUser}
          onConvertToAperturador={handleConvertToAperturador}
          onConvertToIncorporador={handleConvertToIncorporador}
          showError={showError}
        />
      )}
    </div>
  );
}
