"use client";

import { useState, useEffect, useRef } from "react";
import { FiSend } from "react-icons/fi";
import Link from "next/link";

// Detecta servicios mencionados en el texto usando palabras clave asociadas a cada servicio
function detectarServicios(texto, serviciosDisponibles) {
  if (!Array.isArray(serviciosDisponibles)) return [];
  const textoLower = texto.toLowerCase();

  // Palabras clave por tipo de servicio
  const keywords = serviciosDisponibles.reduce((acc, servicio) => {
    acc[servicio.tipo] = servicio.keywords || [];
    return acc;
  }, {});

  // Buscar coincidencias por palabras clave
  const detectados = serviciosDisponibles.filter(servicio => {
    const tipo = servicio.tipo || servicio.nombre?.toLowerCase() || "";
    const nombre = (servicio.nombre || servicio.label || "").toLowerCase();
    const descripcion = (servicio.descripcion || "").toLowerCase();

    // Buscar por palabras clave asociadas
    const keys = keywords[tipo] || [];
    if (keys.some(k => textoLower.includes(k))) return true;

    // Buscar por nombre exacto
    if (nombre && textoLower.includes(nombre)) return true;

    // Buscar por palabras del nombre en el texto
    if (nombre && nombre.split(/\s+/).some(word => textoLower.includes(word))) return true;

    // Buscar por palabras del texto en la descripción
    if (descripcion && textoLower.split(/\s+/).some(word => descripcion.includes(word))) return true;

    return false;
  });

  return detectados;
}

export default function ChatIA() {
  const [userMessage, setUserMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
  const bottomRef = useRef(null);

  const handleSend = async () => {
    if (!userMessage.trim()) return;
    const newChat = [...chat, { role: "user", content: userMessage }];
    setChat(newChat);
    setUserMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content:
                "Eres un asistente especializado en servicios generales llamado Sin Batallar Assistant. Ofreces recomendaciones de servicios disponibles basados en las necesidades del usuario. Da respuestas de máximo 3-4 líneas y ofrece contratar servicios si es oportuno.",
            },
            ...newChat,
          ],
        }),
      });

      const data = await response.json();

      if (data.error) {
        setChat((prev) => [...prev, { role: "assistant", content: "No se pudo procesar tu mensaje. Verifica la conexión o intenta más tarde." }]);
      } else {
        const aiResponse = data.choices?.[0]?.message?.content || "No pude procesar tu solicitud, intenta de nuevo.";
        setChat((prev) => [...prev, { role: "assistant", content: aiResponse }]);
      }
    } catch (error) {
      setChat((prev) => [...prev, { role: "assistant", content: "Hubo un error. Por favor intenta más tarde." }]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar servicios desde el endpoint al montar
  useEffect(() => {
    async function fetchServicios() {
      try {
        const res = await fetch("/api/servicios");
        const data = await res.json();
        const normalizados = Array.isArray(data)
          ? data.map(s => ({
              tipo: s.tipo || s.nombre?.toLowerCase() || s._id,
              nombre: s.nombre || s.tipo || "Servicio",
              descripcion: s.descripcion || "",
              label: s.nombre || s.tipo || "Servicio",
              keywords: s.keywords || [],
              _id: s._id
            }))
          : [];
        setServiciosDisponibles(normalizados);
      } catch {
        setServiciosDisponibles([]);
      }
    }
    fetchServicios();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  return (
    <div className="bg-background min-h-screen text-foreground flex flex-col">
      <div className="flex flex-col flex-1 max-w-2xl w-full mx-auto bg-card-bg rounded-lg shadow-md border border-input-border overflow-hidden">
        <div className="p-4 border-b border-input-border text-center">
          <h1 className="text-2xl font-bold">Sin Batallar Assistant</h1>
          <p className="text-gray-400 text-sm mt-1">Consulta rápida para servicios generales</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
          {chat.map((message, index) => (
            <div key={index}>
              <div
                className={`p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-primary/30 self-end text-right"
                    : "bg-input-bg self-start text-left"
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
              </div>
              {message.role === "assistant" &&
                detectarServicios(message.content, serviciosDisponibles).map((servicio) => (
                  <Link key={servicio._id} href={`/main/extra/serviceForm?tipo=${encodeURIComponent(servicio.tipo)}`}>
                    <button className="mt-2 mr-2 bg-primary hover:bg-primary-hover text-white py-2 px-4 rounded-lg text-xs transition-colors">
                      {servicio.label}
                    </button>
                  </Link>
                ))}
            </div>
          ))}

          {loading && (
            <div className="p-3 rounded-lg bg-input-bg text-left animate-pulse">
              <p className="text-sm text-gray-400">El asistente está escribiendo...</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 flex items-center gap-2 bg-background border-t border-input-border">
          <input
            type="text"
            placeholder="Describe tu problema..."
            className="flex-1 bg-input-bg text-foreground py-2 px-4 rounded-md border border-input-border focus:outline-none focus:border-primary transition-colors"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!userMessage.trim()}
            className="bg-primary hover:bg-primary-hover text-white p-2 rounded-full disabled:bg-gray-600 transition-colors"
          >
            <FiSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
