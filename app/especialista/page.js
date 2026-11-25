"use client";
import { useSession } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import EspecialistaDashboard from '@/components/view/inicial/EspecialistaDashboard';

// Modelo inicial: panel del especialista
export default function EspecialistaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (session.user?.role !== 'especialista') router.push('/');
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!session || session.user?.role !== 'especialista') return null;

  return <EspecialistaDashboard />;
}
