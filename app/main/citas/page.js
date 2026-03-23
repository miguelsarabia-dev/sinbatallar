import { Suspense } from "react";
import Header from "@/components/view/main/Header";
import CitasCliente from "@/components/view/cliente/CitasCliente";

export default function CitasPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>}>
        <div className="bg-gray-50 min-h-screen py-8">
          <CitasCliente />
        </div>
      </Suspense>
    </>
  );
}
