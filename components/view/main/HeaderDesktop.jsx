"use client";

import Link from "next/link";
import Image from "next/image";
import { FaUser } from "react-icons/fa";
import { usePathname, useRouter } from "next/navigation";

/**
 * Header simplificado para Desktop/Tablet
 * Solo visible en pantallas >= md (768px)
 */
export default function HeaderDesktop({ navigationLinks }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full bg-white border-b border-neutral shadow-sm">
      <div className="mx-auto px-4 lg:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/main/servicios-programables" className="flex items-center gap-3">
              <div className="rounded-xl overflow-hidden w-10 h-10 bg-primary p-1">
                <Image
                  src="/images/sinBatallarMini.png"
                  alt="Sin Batallar logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <Image
                src="/images/sinbatallartext.png"
                alt="Sin Batallar"
                width={140}
                height={32}
                className="h-8 object-contain hidden lg:block"
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1">
            {navigationLinks.map((link) => (
              <NavItem
                key={link.href}
                href={link.href}
                active={pathname === link.href}
                icon={link.icon}
              >
                {link.name}
              </NavItem>
            ))}
          </nav>

          {/* User Profile Button */}
          <button
            className="text-gray-600 hover:bg-gray-100 p-2.5 rounded-full transition-colors"
            onClick={() => router.push("/main/userProfile")}
            aria-label="Perfil de usuario"
          >
            <FaUser size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavItem({ href, children, active, icon }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center ${
        active
          ? "bg-primary text-white shadow-md"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {icon && <span className="mr-2 text-base">{icon}</span>}
      {children}
    </Link>
  );
}
