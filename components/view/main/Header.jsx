"use client";

import { useSession } from '@/contexts/AuthContext';
import { FaCalendarAlt, FaClipboardList, FaLifeRing, FaCog, FaToolbox, FaShieldAlt } from "react-icons/fa";
import HeaderDesktop from "./HeaderDesktop";
import HeaderMobile from "./HeaderMobile";
import BottomNavMobile from "./BottomNavMobile";

// Enlaces base para clientes
const clienteNavigationLinks = [
  {
    name: "Servicios",
    href: "/main/servicios-programables",
    icon: <FaCalendarAlt size={16} />,
  },
  {
    name: "Mis Citas",
    href: "/main/citas",
    icon: <FaClipboardList size={16} />,
  },
  {
    name: "Asistencia",
    href: "/main/asistencia",
    icon: <FaLifeRing size={16} />,
  },
];

// Enlaces para contratistas
const contratistaNavigationLinks = [
  {
    name: "Dashboard",
    href: "/contratista/dashboard",
    icon: <FaCog size={16} />,
  },
];



/**
 * Componente principal de navegación
 * Orquesta Header (desktop) y Bottom Nav (mobile)
 */
export default function Header() {
  const { data: session } = useSession();

  // Generar enlaces de navegación dinámicamente basados en el rol del usuario
  const getNavigationLinks = () => {
    const userRole = session?.user?.userType || session?.user?.role;

    switch (userRole) {
      case "contratista":
        return contratistaNavigationLinks;

      case "admin":
        return [
          ...clienteNavigationLinks,
          {
            name: "Admin",
            href: "/admin",
            icon: <FaShieldAlt size={16} />,
          },
        ];
      default:
        return clienteNavigationLinks;
    }
  };

  const navigationLinks = getNavigationLinks();

  return (
    <>
      {/* Header Desktop (>= md) */}
      <HeaderDesktop navigationLinks={navigationLinks} />

      {/* Header Mobile (< md) */}
      <HeaderMobile />

      {/* Bottom Navigation Mobile (< md) */}
      <BottomNavMobile navigationLinks={navigationLinks} />
    </>
  );
}
