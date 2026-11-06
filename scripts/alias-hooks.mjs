// scripts/alias-hooks.mjs — resuelve en Node los imports de la app: '@/x' (alias de jsconfig) y rutas relativas sin
// extensión ('./email'), para poder reutilizar lib/*.js en scripts sin duplicar lógica.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const intentos = (base) => [base, `${base}.js`, `${base}.mjs`, path.join(base, 'index.js')];

export async function resolve(specifier, context, nextResolve) {
  let base = null;
  if (specifier.startsWith('@/')) {
    base = path.join(RAIZ, specifier.slice(2));
  } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier) && context.parentURL?.startsWith('file:')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base) {
    for (const candidato of intentos(base)) {
      if (fs.existsSync(candidato) && fs.statSync(candidato).isFile()) {
        return nextResolve(pathToFileURL(candidato).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
