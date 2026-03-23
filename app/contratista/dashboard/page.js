// app/contratista/dashboard/page.js
import ContratistaDashboard from "@/components/view/contratista/ContratistaDashboardNuevo";

// El middleware ya verifica la autenticación y el rol contratista
export default function DashboardPage() {
  return <ContratistaDashboard />;
}
