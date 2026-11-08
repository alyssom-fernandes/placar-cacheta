// Gera docs/index.html a partir do app.html. A pasta docs/ é o que o GitHub Pages mostra.
// Rodar na pasta do projeto:  node ferramentas/publicar.mjs   e depois fazer commit e push.
import { mkdir, writeFile } from 'node:fs/promises';
import { montarPagina } from './pagina.mjs';

const pagina = await montarPagina();
await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/index.html', import.meta.url), pagina);
console.log(`Pronto: docs/index.html gerado (${Math.round(pagina.length / 1024)} KB).`);
