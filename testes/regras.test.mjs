// Testes das regras de pontuação usadas pelo app.
// Rodar na pasta do projeto:  node testes/regras.test.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const trecho = html.match(/\/\/ #region motor\r?\n([\s\S]*?)\/\/ #endregion motor/);
if (!trecho) throw new Error('Não achei o trecho "// #region motor" em app.html');
const Motor = new Function(`${trecho[1]}\nreturn Motor;`)();

let total = 0;
let falhas = 0;
function teste(nome, fn) {
  total += 1;
  try {
    fn();
    console.log(`  ok    ${nome}`);
  } catch (e) {
    falhas += 1;
    console.log(`  ERRO  ${nome}\n        ${String(e.message).split('\n').join('\n        ')}`);
  }
}

const NOMES = ['Ana', 'Bia', 'Caio', 'Davi'];
function nova(nomes = NOMES, regras) {
  return Motor.criarPartida({ id: 't', inicio: '', jogadores: nomes.map((nome, i) => ({ id: `j${i}`, nome })), regras });
}
const pts = p => Motor.situacao(p).pontos;
// Anota várias rodadas seguidas. Cada rodada: { correu: [...ids], ganhou: id }
function rodadas(p, lista) {
  for (const r of lista) {
    const marcas = {};
    for (const id of r.correu || []) marcas[id] = 'correu';
    if (r.ganhou) marcas[r.ganhou] = 'ganhou';
    p = Motor.anotar(p, marcas, '');
  }
  return p;
}

console.log('\nRegras da cacheta\n');

teste('todo mundo começa com 10 pontos', () => {
  assert.deepEqual(pts(nova()), { j0: 10, j1: 10, j2: 10, j3: 10 });
});

teste('quem corre perde 1, quem joga e perde perde 2, quem ganha não perde nada', () => {
  const p = rodadas(nova(), [{ correu: ['j1'], ganhou: 'j0' }]);
  assert.deepEqual(pts(p), { j0: 10, j1: 9, j2: 8, j3: 8 });
});

teste('com 1 ponto não pode correr: a marca de Correu é ignorada e a pessoa joga', () => {
  // j1 cai para 1 ponto: 10 -> 8 -> 6 -> 4 -> 2 -> 1 (correu com 2)
  let p = rodadas(nova(), [
    { ganhou: 'j0' }, { ganhou: 'j0' }, { ganhou: 'j0' }, { ganhou: 'j0' },
    { correu: ['j1'], ganhou: 'j0' },
  ]);
  assert.equal(pts(p).j1, 1);
  assert.equal(Motor.podeCorrer(1, Motor.REGRAS_PADRAO), false);
  const a = Motor.avaliar(p, { j1: 'correu', j0: 'ganhou' });
  assert.ok(!a.correram.includes('j1'), 'j1 não deveria constar como quem correu');
  assert.ok(a.jogaram.includes('j1'), 'j1 deveria jogar');
  p = Motor.anotar(p, { j1: 'correu', j0: 'ganhou' }, '');
  assert.ok(Motor.situacao(p).saiuNa.j1, 'j1 jogou com 1 ponto, perdeu e deveria ter saído');
});

teste('com 2 pontos ainda pode correr e fica com 1', () => {
  assert.equal(Motor.podeCorrer(2, Motor.REGRAS_PADRAO), true);
});

teste('se só uma pessoa jogou, ela ganha a rodada sozinha', () => {
  const p = nova();
  const a = Motor.avaliar(p, { j1: 'correu', j2: 'correu', j3: 'correu' });
  assert.equal(a.ok, true);
  assert.equal(a.vencedor, 'j0');
  assert.equal(a.automatico, true);
  const depois = Motor.anotar(p, { j1: 'correu', j2: 'correu', j3: 'correu' }, '');
  assert.deepEqual(pts(depois), { j0: 10, j1: 9, j2: 9, j3: 9 });
});

teste('se todo mundo correu, a rodada não pode ser anotada', () => {
  const p = nova();
  const marcas = { j0: 'correu', j1: 'correu', j2: 'correu', j3: 'correu' };
  assert.equal(Motor.avaliar(p, marcas).problema, 'ninguem-jogou');
  assert.throws(() => Motor.anotar(p, marcas, ''), /ninguem-jogou/);
});

teste('sem ninguém marcado em Ganhou, a rodada não pode ser anotada', () => {
  const p = nova();
  assert.equal(Motor.avaliar(p, { j3: 'correu' }).problema, 'falta-vencedor');
  assert.throws(() => Motor.anotar(p, {}, ''), /falta-vencedor/);
});

teste('antes de saber quem ganhou, quem jogou fica sem previsão e quem correu já aparece com -1', () => {
  const a = Motor.avaliar(nova(), { j3: 'correu' });
  assert.equal(a.depois.j0, null);
  assert.equal(a.depois.j3, 9);
});

teste('quem chega a 0 sai e fica registrado em que rodada saiu', () => {
  // j3 perde 2 por rodada: 10, 8, 6, 4, 2, 0 -> sai na rodada 5
  const p = rodadas(nova(), Array.from({ length: 5 }, () => ({ ganhou: 'j0' })));
  const s = Motor.situacao(p);
  assert.equal(s.pontos.j3, 0);
  assert.equal(s.saiuNa.j3, 5);
  assert.ok(!s.ativos.includes('j3'));
});

teste('quem tem 1 ponto, joga e perde, sai do jogo', () => {
  let p = rodadas(nova(['Ana', 'Bia', 'Caio']), [
    { ganhou: 'j0' }, { ganhou: 'j0' }, { ganhou: 'j0' }, { ganhou: 'j0' },
    { correu: ['j1', 'j2'], ganhou: 'j0' },
  ]);
  assert.equal(pts(p).j1, 1);
  p = rodadas(p, [{ ganhou: 'j2' }]);
  assert.equal(pts(p).j1, -1);
  assert.equal(Motor.situacao(p).saiuNa.j1, 6);
});

teste('quem saiu não entra mais nas rodadas seguintes', () => {
  let p = rodadas(nova(), Array.from({ length: 5 }, () => ({ correu: ['j1', 'j2'], ganhou: 'j0' })));
  assert.equal(Motor.situacao(p).saiuNa.j3, 5);
  p = Motor.anotar(p, { j3: 'ganhou', j1: 'ganhou' }, '');
  const ultima = p.rodadas[p.rodadas.length - 1];
  assert.ok(!ultima.jogaram.includes('j3') && !ultima.correram.includes('j3'));
  assert.equal(ultima.vencedor, 'j1');
});

teste('marcado em Perdeu conta como quem jogou e perdeu', () => {
  const p = rodadas(nova(), []);
  const a = Motor.avaliar(p, { j1: 'perdeu', j2: 'perdeu', j3: 'correu', j0: 'ganhou' });
  assert.deepEqual(a.jogaram, ['j0', 'j1', 'j2']);
  assert.deepEqual(a.correram, ['j3']);
  const depois = Motor.anotar(p, { j1: 'perdeu', j2: 'perdeu', j3: 'correu', j0: 'ganhou' }, '');
  assert.deepEqual(pts(depois), { j0: 10, j1: 8, j2: 8, j3: 9 });
});

teste('se todos os outros correram, quem sobrou ganha mesmo marcado em Perdeu', () => {
  const a = Motor.avaliar(nova(), { j0: 'perdeu', j1: 'correu', j2: 'correu', j3: 'correu' });
  assert.equal(a.vencedor, 'j0');
  assert.equal(a.automatico, true);
});

teste('várias pessoas marcadas em Ganhou: vale a primeira da mesa', () => {
  const a = Motor.avaliar(nova(), { j2: 'ganhou', j1: 'ganhou' });
  assert.equal(a.vencedor, 'j1');
});

teste('a partida acaba quando sobra uma pessoa, e ela é a campeã', () => {
  const p = rodadas(nova(['Ana', 'Bia']), Array.from({ length: 5 }, () => ({ ganhou: 'j0' })));
  const s = Motor.situacao(p);
  assert.equal(s.acabou, true);
  assert.equal(s.campeao, 'j0');
  assert.throws(() => Motor.anotar(p, { j0: 'ganhou' }, ''), /partida-encerrada/);
});

teste('a rodada que encerra a partida é avisada antes de anotar', () => {
  const p = rodadas(nova(['Ana', 'Bia']), Array.from({ length: 4 }, () => ({ ganhou: 'j0' })));
  const a = Motor.avaliar(p, { j0: 'ganhou' });
  assert.equal(a.encerra, true);
  assert.deepEqual(a.saem, ['j1']);
  assert.deepEqual(a.ficam, ['j0']);
});

teste('desfazer volta os pontos e devolve as marcações da rodada', () => {
  const p0 = nova();
  const p1 = rodadas(p0, [{ correu: ['j2'], ganhou: 'j3' }]);
  const voltou = Motor.desfazer(p1);
  assert.deepEqual(pts(voltou), pts(p0));
  assert.equal(voltou.rodadas.length, 0);
  assert.deepEqual(Motor.marcasDaRodada(p1.rodadas[0]), { j2: 'correu', j3: 'ganhou' });
  assert.equal(Motor.desfazer(p0), p0, 'desfazer sem rodadas não muda nada');
});

teste('desfazer a rodada final reabre a partida', () => {
  const p = rodadas(nova(['Ana', 'Bia']), Array.from({ length: 5 }, () => ({ ganhou: 'j0' })));
  const voltou = Motor.desfazer(p);
  const s = Motor.situacao(voltou);
  assert.equal(s.acabou, false);
  assert.deepEqual(s.ativos, ['j0', 'j1']);
});

teste('classificação: quem saiu por último fica na frente; quem saiu junto empata', () => {
  // Bia e Caio saem juntos na rodada 5; Davi sai depois; Ana vence.
  let p = rodadas(nova(), Array.from({ length: 5 }, () => ({ correu: ['j3'], ganhou: 'j0' })));
  let s = Motor.situacao(p);
  assert.equal(s.saiuNa.j1, 5);
  assert.equal(s.saiuNa.j2, 5);
  p = rodadas(p, Array.from({ length: 3 }, () => ({ ganhou: 'j0' })));
  s = Motor.situacao(p);
  assert.equal(s.campeao, 'j0');
  const lista = Motor.classificacao(p);
  assert.deepEqual(lista.map(c => [c.nome, c.posicao]), [['Ana', 1], ['Davi', 2], ['Bia', 3], ['Caio', 3]]);
  assert.equal(lista[0].pontos, 10);
  assert.equal(lista[1].saiuNa, 8);
});

teste('regras da casa: começa com 5, correr -2, perder -3', () => {
  const r = { inicio: 5, correr: 2, perder: 3 };
  let p = nova(['Ana', 'Bia', 'Caio'], r);
  assert.deepEqual(pts(p), { j0: 5, j1: 5, j2: 5 });
  p = rodadas(p, [{ correu: ['j1'], ganhou: 'j0' }]);
  assert.deepEqual(pts(p), { j0: 5, j1: 3, j2: 2 });
  assert.equal(Motor.podeCorrer(2, p.regras), false, 'com 2 pontos e correr custando 2, não pode correr');
  assert.equal(Motor.podeCorrer(3, p.regras), true);
});

teste('regras fora do limite são corrigidas', () => {
  assert.deepEqual(Motor.regrasValidas({ inicio: 0, correr: 99, perder: 'x' }), { inicio: 1, correr: 5, perder: 2 });
  assert.deepEqual(Motor.regrasValidas(undefined), { inicio: 10, correr: 1, perder: 2 });
  assert.deepEqual(Motor.regrasValidas({ inicio: 12.6, correr: 1.2, perder: 3 }), { inicio: 13, correr: 1, perder: 3 });
});

teste('caderninho: cada linha bate com a situação depois daquela rodada', () => {
  const p = rodadas(nova(), [
    { correu: ['j1'], ganhou: 'j0' },
    { correu: ['j2', 'j3'], ganhou: 'j1' },
    { ganhou: 'j2' },
  ]);
  const linhas = Motor.linhaDoTempo(p);
  assert.equal(linhas.length, 3);
  assert.deepEqual(linhas[0].celulas.j1, { tipo: 'correu', pontos: 9, perdeu: 1, saiu: false });
  assert.deepEqual(linhas[0].celulas.j0, { tipo: 'ganhou', pontos: 10, perdeu: 0, saiu: false });
  assert.deepEqual(linhas[1].celulas.j0, { tipo: 'perdeu', pontos: 8, perdeu: 2, saiu: false });
  const ultima = linhas[2].celulas;
  const s = Motor.situacao(p);
  for (const id of Object.keys(ultima)) assert.equal(ultima[id].pontos, s.pontos[id]);
});

teste('caderninho marca a rodada em que a pessoa saiu e depois deixa a casa vazia', () => {
  const p = rodadas(nova(['Ana', 'Bia', 'Caio']), Array.from({ length: 6 }, () => ({ correu: ['j1'], ganhou: 'j0' })));
  const linhas = Motor.linhaDoTempo(p);
  assert.equal(linhas[4].celulas.j2.saiu, true);
  assert.equal(linhas[5].celulas.j2.tipo, 'fora');
});

teste('partida lida do aparelho: rodadas incoerentes são descartadas', () => {
  const boa = rodadas(nova(), [{ correu: ['j1'], ganhou: 'j0' }, { ganhou: 'j2' }]);
  const copia = JSON.parse(JSON.stringify(boa));
  assert.deepEqual(Motor.partidaValida(copia), boa);
  // terceira rodada com vencedor que não jogou: tudo a partir dela é descartado
  copia.rodadas.push({ em: '', correram: ['j0'], jogaram: ['j1', 'j2', 'j3'], vencedor: 'j0' });
  copia.rodadas.push({ em: '', correram: [], jogaram: ['j0', 'j1', 'j2', 'j3'], vencedor: 'j0' });
  assert.equal(Motor.partidaValida(copia).rodadas.length, 2);
  // rodada sem um dos jogadores ativos
  const faltando = JSON.parse(JSON.stringify(boa));
  faltando.rodadas.push({ em: '', correram: [], jogaram: ['j0', 'j1'], vencedor: 'j0' });
  assert.equal(Motor.partidaValida(faltando).rodadas.length, 2);
  // correu com 1 ponto (proibido)
  const p1 = rodadas(nova(['Ana', 'Bia']), [{ ganhou: 'j0' }, { ganhou: 'j0' }, { ganhou: 'j0' }, { ganhou: 'j0' }]);
  const errada = JSON.parse(JSON.stringify(p1));
  errada.rodadas.push({ em: '', correram: ['j1'], jogaram: ['j0'], vencedor: 'j0' });
  // j1 tem 2 pontos aqui, então correr é permitido; vamos para 1 ponto e tentar de novo
  const p2 = Motor.partidaValida(errada);
  assert.equal(p2.rodadas.length, 5);
  assert.equal(pts(p2).j1, 1);
  const errada2 = JSON.parse(JSON.stringify(p2));
  errada2.rodadas.push({ em: '', correram: ['j1'], jogaram: ['j0'], vencedor: 'j0' });
  assert.equal(Motor.partidaValida(errada2).rodadas.length, 5);
});

teste('partida lida do aparelho: lixo vira "sem partida"', () => {
  for (const lixo of [null, 1, 'x', {}, { jogadores: 'a' }, { jogadores: [{ id: 'a', nome: 'A' }] }, { jogadores: [{ id: 'a', nome: 'A' }, { id: 'a', nome: 'B' }] }]) {
    assert.equal(Motor.partidaValida(lixo), null, JSON.stringify(lixo));
  }
});

teste('criar partida com menos de 2 pessoas dá erro', () => {
  assert.throws(() => nova(['Ana']), /poucos-jogadores/);
});

// Simulação: muitas partidas sorteadas, conferindo as regras rodada por rodada.
function sorteador(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

teste('simulação: 3.000 partidas sorteadas seguem as regras do começo ao fim', () => {
  const sorte = sorteador(20261108);
  const escolhe = lista => lista[Math.floor(sorte() * lista.length)];
  for (let k = 0; k < 3000; k++) {
    const qtd = 2 + Math.floor(sorte() * 8);
    const regras = sorte() < 0.5 ? Motor.REGRAS_PADRAO : {
      inicio: 1 + Math.floor(sorte() * 30),
      correr: 1 + Math.floor(sorte() * 5),
      perder: 1 + Math.floor(sorte() * 10),
    };
    let p = nova(Array.from({ length: qtd }, (_, i) => `P${i}`), regras);
    const r = p.regras;
    const somaInicial = qtd * r.inicio;
    let voltas = 0;
    for (;;) {
      const s = Motor.situacao(p);
      if (s.acabou) {
        assert.ok(s.campeao, 'toda partida termina com uma campeã');
        assert.ok(s.pontos[s.campeao] > 0);
        for (const j of p.jogadores) if (j.id !== s.campeao) assert.ok(s.pontos[j.id] <= 0);
        assert.equal(Motor.classificacao(p)[0].id, s.campeao);
        break;
      }
      assert.ok(++voltas <= somaInicial, 'a partida precisa acabar');
      const marcas = {};
      for (const id of s.ativos) if (sorte() < 0.35) marcas[id] = 'correu';
      let a = Motor.avaliar(p, marcas, s);
      if (a.problema === 'ninguem-jogou') {
        delete marcas[escolhe(s.ativos)];
        a = Motor.avaliar(p, marcas, s);
      }
      if (a.problema === 'falta-vencedor') {
        marcas[escolhe(a.jogaram)] = 'ganhou';
        a = Motor.avaliar(p, marcas, s);
      }
      assert.equal(a.ok, true);
      const antes = s.pontos;
      p = Motor.anotar(p, marcas, '');
      const depois = Motor.situacao(p).pontos;
      for (const id of s.ativos) {
        if (a.correram.includes(id)) {
          assert.ok(antes[id] - r.correr > 0, 'só corre quem continua com ponto');
          assert.equal(depois[id], antes[id] - r.correr);
        } else if (id === a.vencedor) {
          assert.equal(depois[id], antes[id]);
        } else {
          assert.equal(depois[id], antes[id] - r.perder);
        }
        assert.equal(depois[id], a.depois[id], 'a previsão mostrada na tela bate com o que foi anotado');
      }
      for (const j of p.jogadores) if (!s.ativos.includes(j.id)) assert.equal(depois[j.id], antes[j.id], 'quem já saiu não muda');
    }
    // desfazer tudo volta ao começo
    let q = p;
    while (q.rodadas.length) q = Motor.desfazer(q);
    assert.ok(Object.values(pts(q)).every(v => v === r.inicio));
    // a partida salva e lida de volta continua igual
    assert.deepEqual(Motor.partidaValida(JSON.parse(JSON.stringify(p))), p);
  }
});

console.log(`\n${total - falhas} de ${total} testes passaram.${falhas ? ` ${falhas} falharam.` : ''}\n`);
process.exitCode = falhas ? 1 : 0;
