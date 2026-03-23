"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FaUsers,
  FaSignOutAlt,
  FaServicestack,
  FaClipboard,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaUserPlus,
  FaPlay,
  FaPause,
  FaBan,
  FaTimes,
  FaMoneyBillWave,
  FaBuilding
} from 'react-icons/fa';
import { useModal } from '../../../hooks/useModal';
import Modal from '../../ui/Modal';

import CotizacionesContratista from './CotizacionesContratista';
import GananciasWidget from '../../features/finance/GananciasWidget';
import GestionPagos from './GestionPagos';
import GestionCitas from '../shared/GestionCitas';

const ContratistaDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { modalState, showError, showSuccess, showConfirm, hideModal } = useModal();

  // Estados principales
  const [contratistaData, setContratistaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('citas');

  // Validación de sesión y rol
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'contratista' && session?.user?.userType !== 'contratista') {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchContratistaData();
    }
  }, [session]);



  const fetchContratistaData = async () => {
    try {
      const response = await fetch('/api/contratistas');
      if (response.ok) {
        const data = await response.json();
        const contratista = data.find(c => c.user?.email === session?.user?.email || c.email === session?.user?.email);
        if (contratista) {
          setContratistaData(contratista);
        }
      }
    } catch (error) {
      console.error('Error fetching contratista data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (!session || (session?.user?.role !== 'contratista' && session?.user?.userType !== 'contratista')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-light">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-neutral shadow-sm">
        <div className="mx-auto px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FaBuilding className="text-primary text-xl" />
                <h1 className="text-lg md:text-xl font-bold text-secondary">Panel de Contratista</h1>
              </div>
              <p className="hidden sm:block text-sm text-muted">
                {contratistaData?.nombre || 'Contratista'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="text-muted hover:text-error transition-colors"
                title="Cerrar sesión"
              >
                <FaSignOutAlt className="text-xl" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:px-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Panel Principal - 3/4 en desktop */}
          <div className="xl:col-span-3 space-y-4">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral">
              <div className="grid grid-cols-3 md:grid-cols-5 text-xs sm:text-sm">
                <button
                  onClick={() => setActiveTab('citas')}
                  className={`py-4 px-2 md:px-4 font-medium transition-all border-b-2 flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'citas'
                    ? 'bg-white text-secondary border-primary'
                    : 'bg-neutral-light text-muted border-transparent hover:bg-white hover:text-secondary'
                    }`}
                >
                  <FaClipboard className="flex-shrink-0" />
                  <span>Citas</span>
                </button>
                <button
                  onClick={() => setActiveTab('cotizaciones')}
                  className={`py-4 px-2 md:px-4 font-medium transition-all border-b-2 flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'cotizaciones'
                    ? 'bg-white text-secondary border-primary'
                    : 'bg-neutral-light text-muted border-transparent hover:bg-white hover:text-secondary'
                    }`}
                >
                  <FaMoneyBillWave className="flex-shrink-0" />
                  <span>Cotizaciones</span>
                </button>

                <button
                  onClick={() => setActiveTab('ganancias')}
                  className={`py-4 px-2 md:px-4 font-medium transition-all border-b-2 flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'ganancias'
                    ? 'bg-white text-secondary border-primary'
                    : 'bg-neutral-light text-muted border-transparent hover:bg-white hover:text-secondary'
                    }`}
                >
                  <FaMoneyBillWave className="flex-shrink-0" />
                  <span className="hidden sm:inline">Ganancias</span>
                  <span className="sm:hidden">$</span>
                </button>
                <button
                  onClick={() => setActiveTab('pagos')}
                  className={`py-4 px-2 md:px-4 font-medium transition-all border-b-2 flex items-center justify-center gap-1 md:gap-2 ${activeTab === 'pagos'
                    ? 'bg-white text-secondary border-primary'
                    : 'bg-neutral-light text-muted border-transparent hover:bg-white hover:text-secondary'
                    }`}
                >
                  <FaServicestack className="flex-shrink-0" />
                  <span className="hidden sm:inline">Pagos</span>
                  <span className="sm:hidden">💳</span>
                </button>
              </div>
            </div>

            {/* Contenido de los tabs */}
            {activeTab === 'citas' && (
              <GestionCitas
                role="contratista"
                userId={contratistaData?._id}
                onSuccess={() => { }}
                onError={showError}
              />
            )}

            {activeTab === 'cotizaciones' && (
              <CotizacionesContratista
                contratistaId={contratistaData?._id}
                onSuccess={() => { }}
                onError={showError}
              />
            )}



            {activeTab === 'ganancias' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <GananciasWidget userId={contratistaData?._id} role="contratista" />
              </div>
            )}

            {activeTab === 'pagos' && (
              <GestionPagos contratistaId={contratistaData?._id} />
            )}
          </div>

          {/* Sidebar - 1/4 en desktop */}
          <div className="xl:col-span-1 space-y-4">
            {/* Info del Contratista */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-neutral">
              <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <FaBuilding className="text-primary" />
                Mi Empresa
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted font-medium">Nombre</p>
                  <p className="text-secondary font-bold">{contratistaData?.nombre || 'No especificado'}</p>
                </div>

              </div>
            </div>

            {/* Stats rápidas - solo visible en desktop */}
            <div className="hidden xl:block">
              <GananciasWidget userId={contratistaData?._id} role="contratista" compact={true} />
            </div>
          </div>
        </div>
      </div>



      {/* Modal de notificaciones/errores */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        title={modalState.title}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        onConfirm={modalState.onConfirm}
      >
        {modalState.message}
      </Modal>
    </div>
  );
};

export default ContratistaDashboard;
