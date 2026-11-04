// Utilidades compartidas de las pantallas del panel admin (usan la cookie de sesión del navegador).
export const peso = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`;

export async function api(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const error = new Error(data?.error || `Error ${res.status}`);
        error.datos = data;
        throw error;
    }
    return data;
}

export const json = (metodo, cuerpo) => ({
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo)
});

export const claseBoton = {
    primario: 'bg-primary text-white rounded-md px-3 py-1.5 text-sm hover:opacity-90',
    peligro: 'bg-red-600 text-white rounded-md px-3 py-1.5 text-sm hover:opacity-90',
    suave: 'border border-gray-300 text-gray-700 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50'
};
