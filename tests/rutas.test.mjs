// Barrido automático de seguridad de /api: ninguna ruta puede quedar sin token, sin política o sin sesión en el handler.
// Si agregas un handler nuevo y esta prueba falla, decide explícitamente: exige sesión en el handler, restríngelo
// por rol en lib/policy.js, o (solo si es de solo lectura y para cualquier autenticado) añádelo a SOLO_TOKEN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { decidirAcceso, reglaDe } from '../lib/policy.js';

const RAIZ = path.resolve(import.meta.dirname, '../app/api');
const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// Públicas A PROPÓSITO (login, registro y catálogos del registro). Cualquier otra pública hace fallar la prueba.
const PUBLICAS = new Set([
  'POST /api/auth/login',
  'POST /api/auth/google',
  'POST /api/users',
  'POST /api/contratistas/solicitud',
  'POST /api/ferreteros/solicitud',
  'POST /api/contratistas',
  'POST /api/ferreteros',
  'GET /api/servicios',
  'GET /api/areas?activo=true',
]);

// Sin sesión en el handler ni regla de rol, pero exigen token (middleware): lecturas de catálogo para cualquier autenticado.
const SOLO_TOKEN = new Set([
  'GET /api/categorias',
  'GET /api/areas/determinar-zona',
  'GET /api/ferreteros/ID',
  'GET /api/materiales/buscar',
  'GET /api/materiales/categorias',
  'GET /api/ferreterias-por-zona',
  'GET /api/ferreteros/ID/catalogo',
  'GET /api/servicios-programables',
  'GET /api/servicios-por-zona',
]);

// Escrituras que el middleware ya deja solo a un rol y no necesitan dueño (acción de rol, no sobre un recurso ajeno)
const ESCRITURA_SOLO_ROL = new Set([
]);

function rutas(dir = RAIZ, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) rutas(p, acc);
    else if (e.name === 'route.js') acc.push(p);
  }
  return acc;
}

const urlDe = (archivo) => '/api/' + path.relative(RAIZ, path.dirname(archivo)).split(path.sep)
  .filter(Boolean).map(s => (s.startsWith('[') ? 'ID' : s)).join('/');

const RE_SESION = /requireSession\(|getSessionFromRequest\(|esAdminLaPeticion\(/;

/** [{metodo, url, sesion}] — sesion=true si el handler (o una función local que invoca) exige sesión. */
function handlers(archivo) {
  const src = fs.readFileSync(archivo, 'utf8');
  const partes = src.split(/^export async function /m).slice(1);
  const locales = {};
  for (const m of src.matchAll(/^(?:async )?function (\w+)\([^)]*\)\s*\{([\s\S]*?)^\}/gm)) locales[m[1]] = RE_SESION.test(m[2]);
  return partes.map(p => {
    const metodo = p.match(/^(\w+)/)[1];
    const cuerpo = p.split(/^\}/m)[0];
    const delega = Object.entries(locales).some(([nombre, tiene]) => tiene && new RegExp(`\\b${nombre}\\(`).test(cuerpo));
    return { metodo, url: urlDe(archivo), sesion: RE_SESION.test(cuerpo) || delega };
  }).filter(h => METODOS.includes(h.metodo));
}

const todos = rutas().flatMap(handlers);

test('hay handlers que auditar', () => {
  assert.ok(todos.length > 60, `solo se encontraron ${todos.length} handlers`);
});

test('toda ruta pública está en la lista permitida, y la lista no tiene entradas viejas', () => {
  const encontradas = new Set();
  for (const h of todos) {
    const q = h.url === '/api/areas' && h.metodo === 'GET' ? 'activo=true' : '';
    if (decidirAcceso(h.metodo, h.url, new URLSearchParams(q), null) === 200) {
      encontradas.add(`${h.metodo} ${h.url}${q ? '?' + q : ''}`);
    }
  }
  assert.deepEqual([...encontradas].filter(k => !PUBLICAS.has(k)), [], 'rutas públicas NO permitidas');
  assert.deepEqual([...PUBLICAS].filter(k => !encontradas.has(k)), [], 'entradas de PUBLICAS que ya no son públicas');
});

test('toda ruta no pública responde 401 sin token', () => {
  for (const h of todos) {
    const estado = decidirAcceso(h.metodo, h.url, new URLSearchParams(), null);
    if (estado === 200) continue; // pública (validada arriba)
    assert.equal(estado, 401, `${h.metodo} ${h.url} debería dar 401 sin token`);
  }
});

test('todo handler no público exige sesión, o su ruta está restringida por rol en la política', () => {
  const sinProteccion = [];
  const soloToken = new Set();
  for (const h of todos) {
    const clave = `${h.metodo} ${h.url}`;
    if (decidirAcceso(h.metodo, h.url, new URLSearchParams(h.url === '/api/areas' ? 'activo=true' : ''), null) === 200) continue;
    if (h.sesion) continue;
    const regla = reglaDe(h.metodo, h.url);
    const soloAdmin = !!regla && Array.isArray(regla.roles) && regla.roles.every(r => r === 'admin'); // [] y ['admin'] = solo admin
    if (h.metodo !== 'GET') {
      // Una escritura necesita autorización por dueño en el handler: el rol solo no basta (así se coló el bug de materiales/:id)
      if (soloAdmin || ESCRITURA_SOLO_ROL.has(clave)) continue;
      sinProteccion.push(`${clave} (escritura sin sesión en el handler)`);
      continue;
    }
    if (regla && Array.isArray(regla.roles)) continue; // lectura restringida por rol (el middleware ya la cubre)
    soloToken.add(clave);
    if (!SOLO_TOKEN.has(clave)) sinProteccion.push(clave);
  }
  assert.deepEqual(sinProteccion, [], 'handlers sin sesión ni regla de rol (decide cuál aplicar)');
  assert.deepEqual([...SOLO_TOKEN].filter(k => !soloToken.has(k)), [], 'entradas viejas en SOLO_TOKEN');
});

// Regresión: reglas genéricas (p. ej. DELETE /users/:id solo admin) tapaban rutas específicas ('direcciones' contaba como :id)
test('un handler no puede quedar bloqueado por la política para un rol que él mismo admite', () => {
  const bloqueados = [];
  for (const archivo of rutas()) {
    const src = fs.readFileSync(archivo, 'utf8');
    const url = urlDe(archivo);
    const locales = {};
    for (const m of src.matchAll(/^(?:async )?function (\w+)\([^)]*\)\s*\{([\s\S]*?)^\}/gm)) locales[m[1]] = m[2];
    for (const parte of src.split(/^export async function /m).slice(1)) {
      const metodo = parte.match(/^(\w+)/)[1];
      if (!METODOS.includes(metodo)) continue;
      const cuerpo = parte.split(/^\}/m)[0];
      const textos = [cuerpo, ...Object.entries(locales).filter(([n]) => new RegExp(`\\b${n}\\(`).test(cuerpo)).map(([, c]) => c)];
      const roles = new Set();
      for (const texto of textos) {
        for (const m of texto.matchAll(/requireSession\([^,)]+,\s*\[([^\]]*)\]/g)) {
          for (const r of m[1].matchAll(/'(\w+)'/g)) roles.add(r[1]);
        }
      }
      for (const rol of roles) {
        const q = url === '/api/areas' ? 'activo=true' : '';
        if (decidirAcceso(metodo, url, new URLSearchParams(q), rol) !== 200) bloqueados.push(`${metodo} ${url} bloquea al rol '${rol}' que el handler admite`);
      }
    }
  }
  assert.deepEqual(bloqueados, []);
});

test('direcciones del cliente: DELETE y demás pasan para cliente y no para otros roles', () => {
  const con = (m, rol) => decidirAcceso(m, '/api/users/direcciones', new URLSearchParams(), rol);
  for (const m of ['GET', 'POST', 'PUT', 'DELETE']) {
    assert.equal(con(m, 'cliente'), 200, m);
    assert.equal(con(m, 'contratista'), 403, m);
    assert.equal(con(m, null), 401, m);
  }
  assert.equal(decidirAcceso('PUT', '/api/users/direcciones/principal', new URLSearchParams(), 'cliente'), 200);
  // y DELETE /users/:id sigue siendo solo admin
  assert.equal(decidirAcceso('DELETE', '/api/users/507f1f77bcf86cd799439011', new URLSearchParams(), 'cliente'), 403);
  assert.equal(decidirAcceso('DELETE', '/api/users/507f1f77bcf86cd799439011', new URLSearchParams(), 'admin'), 200);
});

test('rutas del flujo de técnico y cliente: 401 sin token, 403 con el rol equivocado', () => {
  const sin = (m, p) => decidirAcceso(m, p, new URLSearchParams(), null);
  const con = (m, p, rol) => decidirAcceso(m, p, new URLSearchParams(), rol);

  assert.equal(sin('GET', '/api/citas/disponibles'), 401);
  assert.equal(sin('PATCH', '/api/citas/abc/subestado'), 401);
  assert.equal(sin('POST', '/api/citas/abc/tomar-tecnico'), 401);
  assert.equal(sin('PATCH', '/api/citas/abc/confirmar-cliente'), 401);

  assert.equal(con('GET', '/api/citas/disponibles', 'cliente'), 403);
  assert.equal(con('GET', '/api/citas/disponibles', 'tecnico'), 200);
  assert.equal(con('PATCH', '/api/citas/abc/subestado', 'contratista'), 403);
  assert.equal(con('POST', '/api/citas/abc/tomar-tecnico', 'cliente'), 403);
  assert.equal(con('POST', '/api/citas/abc/tomar-tecnico', 'tecnico'), 200);
  assert.equal(con('PATCH', '/api/citas/abc/confirmar-cliente', 'cliente'), 200);
  assert.equal(con('PATCH', '/api/citas/abc/confirmar-cliente', 'tecnico'), 403);
});
