// /app/api/chat/route.js
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

const MAX_MENSAJES = 30;
const MAX_CARACTERES = 8000;

export async function POST(req) {
  try {
    const { error } = await requireSession(req);
    if (error) return error;

    const body = await req.json();

    // Solo mensajes de texto con rol conocido y tamaño acotado (evita abusar de la cuota de Groq)
    const mensajes = Array.isArray(body.messages) ? body.messages.slice(-MAX_MENSAJES) : [];
    const limpios = mensajes
      .filter(m => m && ["user", "assistant", "system"].includes(m.role) && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }));
    if (limpios.length === 0) {
      return NextResponse.json({ error: "messages requerido" }, { status: 400 });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // fijo: el cliente no elige el modelo
        messages: limpios,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error al conectar con Groq:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
