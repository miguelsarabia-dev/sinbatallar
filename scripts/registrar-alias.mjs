// scripts/registrar-alias.mjs — uso: node --import ./scripts/registrar-alias.mjs scripts/<script>.mjs
import { register } from 'node:module';
register('./alias-hooks.mjs', import.meta.url);
