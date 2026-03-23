"use client";

import { useSession } from '@/contexts/AuthContext';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import IncorporadorDashboard from "@/components/view/incorporador/IncorporadorDashboard";

export default function IncorporadorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    // Verificar que el usuario tenga el rol de incorporador
    if (session.user.role !== "incorporador") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!session || session.user.role !== "incorporador") {
    return null;
  }

  return <IncorporadorDashboard />;
}
