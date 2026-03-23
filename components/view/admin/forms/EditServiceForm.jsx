"use client";

import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const EditServiceForm = ({
  editingService,
  onClose,
  onUpdateService,
  showError
}) => {
  const [formData, setFormData] = useState({
    _id: editingService?._id || '',
    nombre: editingService?.nombre || '',
    descripcion: editingService?.descripcion || '',
    categoria: editingService?.categoria || '',
    imagen: null
  });

  const [imagenPreview, setImagenPreview] = useState(
    editingService?.imagen ? `/api/servicios?id=${editingService._id}&imagen=1` : null
  );

  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);



  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      const response = await fetch('/api/categorias');
      if (response.ok) {
        const data = await response.json();
        setCategorias(data);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  const handleCategoriaChange = (e) => {
    const valor = e.target.value;
    if (valor === 'nueva') {
      setMostrarNuevaCategoria(true);
      setFormData(prev => ({ ...prev, categoria: '' }));
      setNuevaCategoria('');
    } else {
      setMostrarNuevaCategoria(false);
      setFormData(prev => ({ ...prev, categoria: valor }));
      setNuevaCategoria('');
    }
  };

  const handleNuevaCategoriaChange = (e) => {
    const valor = e.target.value;
    setNuevaCategoria(valor);
    setFormData(prev => ({ ...prev, categoria: valor }));
  };



  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar campos obligatorios
    if (!formData.nombre?.trim()) {
      showError('El nombre del servicio es obligatorio');
      return;
    }
    if (!formData.descripcion?.trim()) {
      showError('La descripción del servicio es obligatoria');
      return;
    }
    if (!formData.categoria?.trim()) {
      showError('La categoría es obligatoria');
      return;
    }


    const data = new FormData();
    data.append('_id', formData._id);
    data.append('nombre', formData.nombre);
    data.append('descripcion', formData.descripcion);
    data.append('categoria', formData.categoria);

    if (formData.imagen) {
      data.append('imagen', formData.imagen);
    }

    onUpdateService(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Editar Servicio</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Servicio *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imagen del Servicio (opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files[0];
                setFormData(prev => ({ ...prev, imagen: file }));
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setImagenPreview(reader.result);
                  reader.readAsDataURL(file);
                } else {
                  setImagenPreview(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {imagenPreview && (
              <img src={imagenPreview} alt="Vista previa" className="mt-2 max-h-32 rounded" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <div className="space-y-2">
              <select
                value={mostrarNuevaCategoria ? 'nueva' : formData.categoria}
                onChange={handleCategoriaChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="nueva">+ Agregar nueva categoría</option>
              </select>
              {mostrarNuevaCategoria && (
                <input
                  type="text"
                  value={nuevaCategoria}
                  onChange={handleNuevaCategoriaChange}
                  placeholder="Escriba el nombre de la nueva categoría"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              )}
            </div>
          </div>


          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover"
            >
              Actualizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditServiceForm;
