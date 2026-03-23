"use client";
import { FaEdit, FaTrash, FaEye, FaUserShield, FaUser, FaWarehouse, FaTools, FaMapMarkedAlt, FaUserPlus } from 'react-icons/fa';

export default function UserTable({ users, onViewDetails, onEdit, onDelete, loading }) {
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <FaUserShield className="text-red-600" />;
      case 'contratista':
        return <FaWarehouse className="text-blue-600" />;
      case 'aperturador':
        return <FaMapMarkedAlt className="text-green-600" />;
      case 'incorporador':
        return <FaUserPlus className="text-yellow-600" />;
      default:
        return <FaUser className="text-gray-600" />;
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'contratista':
        return 'bg-blue-100 text-blue-800';
      case 'aperturador':
        return 'bg-green-100 text-green-800';
      case 'incorporador':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <FaUser className="mx-auto text-4xl mb-3 text-gray-300" />
          <p className="text-lg font-medium">No se encontraron usuarios</p>
          <p className="text-sm mt-1">Intenta con otros criterios de búsqueda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Vista de escritorio */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actividad
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {user.fotoUrl ? (
                        <img
                          src={user.fotoUrl}
                          alt={user.nombre}
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                        />
                      ) : null}
                      {!user.fotoUrl && <FaUser className="text-gray-500" />}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                    {getRoleIcon(user.role)}
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.telefono || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-500">
                    <div>Citas: {user.stats?.citas || 0}</div>
                    <div>Servicios: {user.stats?.servicios || 0}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center gap-2">
                    <button
                      onClick={() => onViewDetails(user)}
                      className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50 transition-colors"
                      title="Ver detalles"
                    >
                      <FaEye size={16} />
                    </button>
                    <button
                      onClick={() => onEdit(user)}
                      className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 transition-colors"
                      title="Editar usuario"
                    >
                      <FaEdit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(user._id)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 transition-colors"
                      title="Eliminar usuario"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista móvil */}
      <div className="md:hidden divide-y divide-gray-200">
        {users.map((user) => (
          <div key={user._id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {user.fotoUrl ? (
                    <img
                      src={user.fotoUrl}
                      alt={user.nombre}
                      className="h-12 w-12 rounded-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                    />
                  ) : null}
                  {!user.fotoUrl && <FaUser className="text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.nombre}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                      {getRoleIcon(user.role)}
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div>
                <span className="mr-3">Citas: {user.stats?.citas || 0}</span>
                <span>Servicios: {user.stats?.servicios || 0}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => onViewDetails(user)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
              >
                <FaEye size={14} />
                Ver
              </button>
              <button
                onClick={() => onEdit(user)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                <FaEdit size={14} />
                Editar
              </button>
              <button
                onClick={() => onDelete(user._id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
              >
                <FaTrash size={14} />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
