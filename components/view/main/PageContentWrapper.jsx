"use client";

/**
 * Wrapper para contenido de páginas con bottom navigation
 * Agrega padding-bottom en mobile para evitar que el contenido
 * quede oculto detrás del bottom nav
 */
export default function PageContentWrapper({ children, className = "" }) {
  return (
    <div className={`pb-0 md:pb-0 ${className}`}>
      {children}
      {/* Spacer para bottom navigation en mobile */}
      <div className="h-16 md:hidden" aria-hidden="true"></div>
    </div>
  );
}
