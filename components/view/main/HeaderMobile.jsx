"use client";

import Link from "next/link";
import Image from "next/image";
import { FaUser } from "react-icons/fa";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

/**
 * Header simplificado para Mobile
 * Solo logo y perfil, sin navegación
 */
export default function HeaderMobile() {
  const router = useRouter();

  return (
    <header className="md:hidden sticky top-0 z-40 w-full bg-white border-b border-neutral shadow-sm">
      <div className="mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/main/servicios-programables" className="flex items-center gap-2">
            <div className="rounded-xl overflow-hidden w-9 h-9 bg-primary p-1">
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
              width={120}
              height={28}
              className="h-7 object-contain"
            />
          </Link>

          {/* User Profile Button */}
          <button
            className="text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
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
