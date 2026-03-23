"use client"
import { useSession } from '@/contexts/AuthContext'
import { FiPhone, FiMessageCircle } from "react-icons/fi"
import { useRouter } from "next/navigation"

const Asistencia = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Función para manejar la llamada de asistencia
  const handleLlamada = () => {
    window.location.href = "tel:+526141110404"
  }

  // Función para manejar el inicio de chat
  const handleChat = () => {
    router.push("/main/asistencia/aiChat")
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acceso no autorizado</h2>
          <p className="text-gray-600 mb-6">Necesitas iniciar sesión para acceder a la asistencia.</p>
          <button
            onClick={() => router.push("/")}
            className="bg-primary hover:bg-primary-hover text-white py-2 px-4 rounded-md transition-colors"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16 md:pb-0 transition-colors">
      <div className="container mx-auto px-4 py-6 pt-8">
        <h1 className="text-3xl font-bold mb-6">Asistencia Especial</h1>

        {/* Sección de Asistencia telefónica */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Asistencia telefónica</h2>
          <p className="text-gray-600 mb-4">No te pongas en riesgo, obtén una llamada para asistencia.</p>
          <button
            onClick={handleLlamada}
            className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-md flex items-center justify-center transition-colors"
          >
            <FiPhone className="mr-2" size={20} />
            Llamar para asistencia
          </button>
        </section>

        {/* Separador */}
        <div className="border-t border-gray-300 my-6 transition-colors"></div>

        {/* Sección de Atención 24/7 */}
        <section>
          <h2 className="text-2xl font-bold mb-2">Atención 24/7</h2>
          <p className="text-gray-600 mb-4">
            Chatea con una IA que te ayude a resolver los diferentes problemas que puedas tener.
          </p>
          <button
            onClick={handleChat}
            className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-md flex items-center justify-center transition-colors"
          >
            <FiMessageCircle className="mr-2" size={20} />
            Chatear
          </button>
        </section>
      </div>
    </div>
  )
}

export default Asistencia