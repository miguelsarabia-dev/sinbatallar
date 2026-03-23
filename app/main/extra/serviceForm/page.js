import { Suspense } from "react";
import Header from "@/components/view/main/Header";
import ServiceForm from "@/components/view/main/serviceForm";

export default function ServiceFormPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>}>
        <ServiceForm />
      </Suspense>
    </>
  );
}
