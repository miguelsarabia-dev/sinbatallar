"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

/**
 * Bottom Navigation Bar para Mobile
 * Solo visible en pantallas < md (768px)
 */
export default function BottomNavMobile({ navigationLinks }) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navigationLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            icon={React.cloneElement(link.icon, { size: 24 })}
            active={pathname === link.href}
          >
            {link.name}
          </NavItem>
        ))}
      </div>
    </nav>
  );
}

function NavItem({ href, children, icon, active }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 group"
    >
      <span
        className={`mb-1 text-lg transition-all ${
          active
            ? "text-primary scale-110"
            : "text-gray-400 group-hover:text-gray-600"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-xs font-medium truncate max-w-[60px] transition-colors ${
          active ? "text-primary font-semibold" : "text-gray-400 group-hover:text-gray-600"
        }`}
      >
        {children}
      </span>
    </Link>
  );
}
