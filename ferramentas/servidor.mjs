// Servidor local de pré-visualização: mostra o app.html como ele aparece no celular, sem gerar arquivos.
// Lê o app.html a cada vez que a página é aberta, então é só salvar e recarregar.
// Rodar na pasta do projeto:  node ferramentas/servidor.mjs   (porta opcional: node ferramentas/servidor.mjs 5174)
// Atende só este computador (127.0.0.1); não fica visível para outros aparelhos da rede.
import { createServer } from 'node:http';
import { montarPagina } from './pagina.mjs';

const porta = Number(process.argv[2]) || 5174;

createServer(async (pedido, resposta) => {
  const caminho = new URL(pedido.url, 'http://localhost').pathname;
  if (caminho !== '/' && caminho !== '/index.html') {
    resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
    return;
  }
  try {
    const pagina = await montarPagina();
    resposta.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    resposta.end(pagina);
  } catch (erro) {
    resposta.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`Não consegui montar a página: ${erro.message}`);
  }
}).listen(porta, '127.0.0.1', () => {
  console.log(`Pré-visualização do Placar da Cacheta em http://localhost:${porta}  (Ctrl+C para parar)`);
});
