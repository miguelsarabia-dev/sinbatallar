// app/admin/page.js
import AdminDashboard from '@/components/view/admin/AdminDashboard';
import Header from '@/components/view/main/Header';

// El middleware ya verifica la autenticación y el rol admin
export default function AdminPage() {
  return (
    <>
      <Header />
      <AdminDashboard />
    </>
  );
}
