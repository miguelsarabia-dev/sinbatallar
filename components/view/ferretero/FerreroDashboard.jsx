'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, signOut } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useModal } from '@/hooks/useModal';
import Modal from '@/components/ui/Modal';
import {
  FaStore, FaBoxOpen, FaPlus, FaEdit, FaTrash, FaSearch,
  FaToggleOn, FaToggleOff, FaSignOutAlt, FaBars, FaTimes,
  FaTag, FaChevronDown, FaCheck, FaImage, FaSave
} from 'react-icons/fa';

const UNIDADES = [
  { value: 'pieza', label: 'Pieza' },
  { value: 'metro', label: 'Metro lineal' },
  { value: 'metro2', label: 'Metro cuadrado' },
  { value: 'metro3', label: 'Metro cúbico' },
  { value: 'litro', label: 'Litro' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'caja', label: 'Caja' },
  { value: 'rollo', label: 'Rollo' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'par', label: 'Par' },
  { value: 'juego', label: 'Juego' },
  { value: 'otro', label: 'Otro' },
];

const FORM_VACIO = {
  nombre: '',
  descripcion: '',
  categoria: '',
  categoriaPersonalizada: '',
  marca: '',
  unidad: 'pieza',
  precio: '',
  imagenUrl: '',
  imagenPublicId: '',
  activo: true,
};

export default function FerreroDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { modalState, showSuccess, showError, showConfirm, hideModal } = useModal();

  // Datos del perfil
  const [ferreteroData, setFerreteroData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Catálogo
  const [materiales, setMateriales] = useState([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);
  const [categorias, setCategorias] = useState([]);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');

  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [loadingForm, setLoadingForm] = useState(false);
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState('');
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // ─── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    const role = user.role || user.userType;
    if (role !== 'ferretero') { router.push('/login'); return; }
  }, [user, authLoading, router]);

  // ─── Carga inicial ────────────────────────────────────────────────────────────
  const cargarPerfil = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/ferreteros?userId=${user.id}`);
      if (res.ok) setFerreteroData(await res.json());
    } catch { /* silencioso */ }
  }, [user?.id]);

  const cargarMateriales = useCallback(async () => {
    if (!user?.id) return;
    setLoadingMateriales(true);
    try {
      const res = await fetch(`/api/materiales?ferreteroUserId=${user.id}&soloActivos=false`);
      if (res.ok) setMateriales(await res.json());
    } catch {
      showError('Error al cargar el catálogo');
    } finally {
      setLoadingMateriales(false);
    }
  }, [user?.id]);

  const cargarCategorias = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/materiales/categorias?ferreteroUserId=${user.id}`);
      if (res.ok) setCategorias(await res.json());
    } catch { /* silencioso */ }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([cargarPerfil(), cargarMateriales(), cargarCategorias()])
      .finally(() => setLoading(false));
  }, [user?.id]);

  // ─── Toggle catálogo completo ─────────────────────────────────────────────────
  const toggleCatalogo = async () => {
    if (!ferreteroData?._id) return;
    const nuevoEstado = !ferreteroData.catalogoActivo;
    try {
      const res = await fetch(`/api/ferreteros/${ferreteroData._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogoActivo: nuevoEstado }),
      });
      if (res.ok) {
        setFerreteroData(prev => ({ ...prev, catalogoActivo: nuevoEstado }));
        if (!nuevoEstado) setMateriales(prev => prev.map(m => ({ ...m, activo: false })));
        showSuccess(`Catálogo ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`);
      }
    } catch {
      showError('Error al cambiar estado del catálogo');
    }
  };

  // ─── Toggle activo individual ─────────────────────────────────────────────────
  const toggleMaterial = async (material) => {
    try {
      const res = await fetch(`/api/materiales/${material._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !material.activo }),
      });
      if (res.ok) {
        setMateriales(prev =>
          prev.map(m => m._id === material._id ? { ...m, activo: !m.activo } : m)
        );
      }
    } catch {
      showError('Error al cambiar estado del material');
    }
  };

  // ─── Eliminar ─────────────────────────────────────────────────────────────────
  const eliminarMaterial = (id) => {
    showConfirm('¿Eliminar este material del catálogo? Esta acción no se puede deshacer.', async () => {
      try {
        const res = await fetch(`/api/materiales/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setMateriales(prev => prev.filter(m => m._id !== id));
          showSuccess('Material eliminado');
        }
      } catch {
        showError('Error al eliminar el material');
      }
    }, 'Eliminar material');
  };

  // ─── Imagen ───────────────────────────────────────────────────────────────────
  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagenFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagenPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const subirImagen = async (materialId) => {
    if (!imagenFile) return { url: form.imagenUrl, publicId: form.imagenPublicId };
    setSubiendoImagen(true);
    try {
      const fd = new FormData();
      fd.append('imagen', imagenFile);
      if (materialId) fd.append('materialId', materialId);
      const res = await fetch('/api/upload/material-imagen', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Error al subir imagen');
      const data = await res.json();
      return { url: data.url, publicId: data.publicId };
    } finally {
      setSubiendoImagen(false);
    }
  };

  // ─── Abrir / cerrar formulario ────────────────────────────────────────────────
  const abrirCrear = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setImagenFile(null);
    setImagenPreview('');
    setShowForm(true);
  };

  const abrirEditar = (material) => {
    setEditandoId(material._id);
    setForm({
      nombre: material.nombre || '',
      descripcion: material.descripcion || '',
      categoria: material.categoria || '',
      categoriaPersonalizada: '',
      marca: material.marca || '',
      unidad: material.unidad || 'pieza',
      precio: material.precio?.toString() || '',
      imagenUrl: material.imagenUrl || '',
      imagenPublicId: material.imagenPublicId || '',
      activo: material.activo ?? true,
    });
    setImagenFile(null);
    setImagenPreview(material.imagenUrl || '');
    setShowForm(true);
  };

  const cerrarForm = () => {
    setShowForm(false);
    setEditandoId(null);
    setForm(FORM_VACIO);
    setImagenFile(null);
    setImagenPreview('');
  };

  // ─── Guardar (crear o editar) ─────────────────────────────────────────────────
  const guardarMaterial = async (e) => {
    e.preventDefault();

    const categoriaFinal = form.categoria === '__nueva__'
      ? form.categoriaPersonalizada.trim()
      : form.categoria;

    if (!form.nombre.trim()) return showError('El nombre es requerido');
    if (!categoriaFinal) return showError('Selecciona o escribe una categoría');
    if (!form.precio || parseFloat(form.precio) < 0) return showError('El precio debe ser mayor o igual a 0');

    setLoadingForm(true);
    try {
      let imagenUrl = form.imagenUrl;
      let imagenPublicId = form.imagenPublicId;

      if (imagenFile) {
        const result = await subirImagen(editandoId || `new_${Date.now()}`);
        imagenUrl = result.url;
        imagenPublicId = result.publicId;
      }

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        categoria: categoriaFinal,
        marca: form.marca.trim(),
        unidad: form.unidad,
        precio: parseFloat(form.precio),
        imagenUrl,
        imagenPublicId,
        activo: form.activo,
        ferreteroUserId: user.id,
      };

      let res;
      if (editandoId) {
        res = await fetch(`/api/materiales/${editandoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/materiales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }

      showSuccess(editandoId ? 'Material actualizado' : 'Material creado exitosamente');
      cerrarForm();
      await Promise.all([cargarMateriales(), cargarCategorias()]);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoadingForm(false);
    }
  };

  // ─── Materiales filtrados (client-side) ───────────────────────────────────────
  const materialesFiltrados = materiales.filter(m => {
    const matchBusqueda = !busqueda ||
      m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (m.marca || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (m.descripcion || '').toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = !filtroCategoria || m.categoria === filtroCategoria;
    const matchActivo =
      filtroActivo === 'todos' ? true :
      filtroActivo === 'activos' ? m.activo :
      !m.activo;
    return matchBusqueda && matchCategoria && matchActivo;
  });

  const totalActivos = materiales.filter(m => m.activo).length;
  const totalCategorias = [...new Set(materiales.map(m => m.categoria))].length;

  // ─── Guards de render ─────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // FormMaterial se renderiza directamente en JSX (no como sub-componente) para evitar remontaje en cada keystroke

  // ─── Render principal ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">

        {/* ── Sidebar ── */}
        <div className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200
          transform lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-300
        `}>
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FaStore className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {ferreteroData?.nombreNegocio || 'Mi Ferretería'}
              </h1>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-gray-400">
              <FaTimes size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Stats */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-white">
              <div className="text-3xl font-bold">{totalActivos}</div>
              <div className="text-sm opacity-90">Materiales activos</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{materiales.length}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-secondary">{totalCategorias}</div>
                <div className="text-xs text-gray-500">Categorías</div>
              </div>
            </div>

            {/* Toggle catálogo */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Catálogo visible</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ferreteroData?.catalogoActivo ? 'Contratistas pueden ver tus materiales' : 'Catálogo oculto'}
                  </p>
                </div>
                <button
                  onClick={toggleCatalogo}
                  className={`text-2xl transition-colors ${ferreteroData?.catalogoActivo ? 'text-green-500' : 'text-gray-300'}`}
                >
                  {ferreteroData?.catalogoActivo ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-xs text-gray-400 text-center mb-3 truncate px-2">
              {user?.email}
            </div>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FaSignOutAlt />
              <span className="font-medium text-sm">Cerrar sesión</span>
            </button>
          </div>
        </div>

        {/* Overlay mobile */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* ── Contenido principal ── */}
        <div className="flex-1 min-h-screen flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-gray-500">
                <FaBars size={20} />
              </button>
              <h2 className="text-lg font-bold text-gray-900">Mi Catálogo</h2>
            </div>
            <button
              onClick={abrirCrear}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <FaPlus size={14} />
              <span className="hidden sm:inline">Nuevo material</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>

          {/* Banner catálogo inactivo */}
          {ferreteroData && !ferreteroData.catalogoActivo && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 sm:px-6 py-3 flex items-center gap-3">
              <span className="text-yellow-700 text-sm font-medium">
                Tu catálogo está desactivado — los contratistas no pueden verlo.
              </span>
              <button onClick={toggleCatalogo} className="text-yellow-700 underline text-sm font-semibold hover:text-yellow-900">
                Activar
              </button>
            </div>
          )}

          <div className="flex-1 p-4 sm:p-6 space-y-4">
            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, marca o descripción..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={filtroCategoria}
                onChange={e => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todas las categorías</option>
                {[...new Set(materiales.map(m => m.categoria))].sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={filtroActivo}
                onChange={e => setFiltroActivo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="todos">Todos</option>
                <option value="activos">Solo activos</option>
                <option value="inactivos">Solo inactivos</option>
              </select>
            </div>

            {/* Tabla / lista de materiales */}
            {loadingMateriales ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
                <p className="text-gray-400 mt-4 text-sm">Cargando catálogo...</p>
              </div>
            ) : materialesFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <FaBoxOpen className="text-gray-300 text-5xl mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  {materiales.length === 0 ? 'Tu catálogo está vacío' : 'No hay materiales con esos filtros'}
                </p>
                {materiales.length === 0 && (
                  <button
                    onClick={abrirCrear}
                    className="mt-4 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium"
                  >
                    Agregar primer material
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 px-1">
                  {materialesFiltrados.length} {materialesFiltrados.length === 1 ? 'resultado' : 'resultados'}
                </p>

                {/* Desktop: tabla */}
                <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Unidad</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Precio</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {materialesFiltrados.map(material => (
                        <tr key={material._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {material.imagenUrl ? (
                                <img src={material.imagenUrl} alt={material.nombre} className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FaBoxOpen className="text-gray-400" size={16} />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{material.nombre}</p>
                                {material.marca && <p className="text-xs text-gray-400">{material.marca}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
                              <FaTag size={9} />
                              {material.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {UNIDADES.find(u => u.value === material.unidad)?.label || material.unidad}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-gray-900">
                              ${material.precio?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleMaterial(material)} className="focus:outline-none">
                              {material.activo ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  <FaCheck size={9} /> Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                                  Inactivo
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => abrirEditar(material)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <FaEdit size={14} />
                              </button>
                              <button
                                onClick={() => eliminarMaterial(material._id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: cards */}
                <div className="md:hidden space-y-3">
                  {materialesFiltrados.map(material => (
                    <div key={material._id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        {material.imagenUrl ? (
                          <img src={material.imagenUrl} alt={material.nombre} className="w-14 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FaBoxOpen className="text-gray-400" size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{material.nombre}</p>
                              {material.marca && <p className="text-xs text-gray-400">{material.marca}</p>}
                            </div>
                            <span className="text-base font-bold text-gray-900 flex-shrink-0">
                              ${material.precio?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs">{material.categoria}</span>
                            <span className="text-xs text-gray-400">{UNIDADES.find(u => u.value === material.unidad)?.label || material.unidad}</span>
                            <button onClick={() => toggleMaterial(material)}>
                              {material.activo
                                ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Activo</span>
                                : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">Inactivo</span>
                              }
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => abrirEditar(material)}
                          className="flex-1 flex items-center justify-center gap-2 py-1.5 text-blue-600 bg-blue-50 rounded-lg text-sm font-medium"
                        >
                          <FaEdit size={12} /> Editar
                        </button>
                        <button
                          onClick={() => eliminarMaterial(material._id)}
                          className="flex-1 flex items-center justify-center gap-2 py-1.5 text-red-500 bg-red-50 rounded-lg text-sm font-medium"
                        >
                          <FaTrash size={12} /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal formulario — inline para evitar remontaje en cada keystroke */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">
                {editandoId ? 'Editar material' : 'Nuevo material'}
              </h3>
              <button onClick={cerrarForm} className="text-gray-400 hover:text-gray-600 p-1">
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={guardarMaterial} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Cemento Portland 50kg"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Descripción opcional del material"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__nueva__">+ Nueva categoría</option>
                  </select>
                  {form.categoria === '__nueva__' && (
                    <input
                      type="text"
                      value={form.categoriaPersonalizada}
                      onChange={e => setForm(p => ({ ...p, categoriaPersonalizada: e.target.value }))}
                      className="mt-2 w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nombre de la nueva categoría"
                      required
                    />
                  )}
                </div>

                {/* Marca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    value={form.marca}
                    onChange={e => setForm(p => ({ ...p, marca: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: CEMEX, 3M, Truper..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Unidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
                  <select
                    value={form.unidad}
                    onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {UNIDADES.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>

                {/* Precio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio (MXN) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      type="number"
                      value={form.precio}
                      onChange={e => setForm(p => ({ ...p, precio: e.target.value }))}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Imagen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
                <div className="flex items-start gap-4">
                  {imagenPreview ? (
                    <div className="relative flex-shrink-0">
                      <img
                        src={imagenPreview}
                        alt="preview"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => { setImagenFile(null); setImagenPreview(''); setForm(p => ({ ...p, imagenUrl: '', imagenPublicId: '' })); }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                      <FaImage size={24} />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleImagenChange} className="hidden" />
                    <div className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 text-center cursor-pointer">
                      {imagenPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP. Máx 5MB.</p>
                  </label>
                </div>
              </div>

              {/* Activo */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.activo ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700">{form.activo ? 'Activo en catálogo' : 'Inactivo (oculto)'}</span>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white border-t border-gray-100 -mx-6 px-6 pb-2">
                <button
                  type="button"
                  onClick={cerrarForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingForm || subiendoImagen}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  {(loadingForm || subiendoImagen) ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{subiendoImagen ? 'Subiendo imagen...' : 'Guardando...'}</>
                  ) : (
                    <><FaSave size={14} />{editandoId ? 'Guardar cambios' : 'Crear material'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmaciones */}
      <Modal {...modalState} onClose={hideModal} />
    </div>
  );
}
