// components/ui/LegalSection.jsx
// Tarjeta de sección reutilizada por las páginas legales (Privacidad, Términos).
// Extraído de app/politicas-de-privacidad/page.js para que ambas páginas compartan
// exactamente el mismo marcado en vez de dos copias que puedan desincronizarse.
export default function LegalSection({ titulo, children }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-3">
      <h2 className="text-lg md:text-xl font-bold text-primary">{titulo}</h2>
      <div className="text-white/85 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-white">
        {children}
      </div>
    </div>
  );
}
