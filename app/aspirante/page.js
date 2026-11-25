"use client";
import { useSession } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AspiranteDashboard from '@/components/view/inicial/AspiranteDashboard';

// Modelo inicial: panel del aspirante
export default function AspirantePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (session.user?.role !== 'aspirante') router.push('/');
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!session || session.user?.role !== 'aspirante') return null;

  return <AspiranteDashboard />;
}
