
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from '@/contexts/AuthContext';
import { useEffect, Suspense } from "react";
import Asistencia from "@/components/view/main/Asistencia";
import Header from "@/components/view/main/Header";

// Componente que usa useSearchParams envuelto en Suspense
function AsistenciaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Verificar autenticación
  useEffect(() => {
    if (status === 'loading') return; // Esperando a que cargue la sesión
    
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  // Mostrar la página de asistencia
  return (
    <>
      <Header />
      <Asistencia />
    </>
  );
}

export default function AsistenciaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>}>
      <AsistenciaContent />
    </Suspense>
  );
}
