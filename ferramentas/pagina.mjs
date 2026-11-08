// Monta a página completa (com <!doctype>, <head> e <body>) a partir do app.html.
// Usado pelo servidor de pré-visualização e pelo script de publicação.
import { readFile } from 'node:fs/promises';

export async function montarPagina() {
  const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
  const marcas = app.match(/<!-- cabeca:inicio -->([\s\S]*?)<!-- cabeca:fim -->/);
  if (!marcas) throw new Error('Não achei <!-- cabeca:inicio --> e <!-- cabeca:fim --> em app.html');
  const cabeca = marcas[1].trim();
  const corpo = app.slice(marcas.index + marcas[0].length).trim();
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0F5C45">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.4 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
${cabeca}
</head>
<body>
${corpo}
</body>
</html>
`;
}
