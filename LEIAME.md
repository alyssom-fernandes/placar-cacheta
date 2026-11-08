# Placar da Cacheta

Placar para marcar os pontos da cacheta no celular, no lugar do caderninho.

Para abrir: https://alyssom-fernandes.github.io/placar-cacheta/

## Regras usadas

- Todo mundo começa com 10 pontos.
- Depois de olhar as cartas, cada um decide se corre ou joga.
- Quem corre perde 1 ponto. Quem joga e não ganha perde 2. Quem ganha a rodada não perde nada.
- Com 1 ponto não dá para correr: a pessoa joga e tenta a sorte.
- Quem fica sem pontos sai do jogo. Vence quem sobrar com pontos.

Esses números podem ser mudados em **Regras da casa**, antes de começar a partida.

## Como usar na mesa

1. Adicione quem vai jogar e toque em **Começar partida**.
2. A cada rodada, toque em **Correu** em quem correu e em **Ganhou** em quem bateu. Os outros ficam em **Perdeu** sozinhos.
3. Confira os números riscados e toque em **Anotar rodada**. Errou? Toque em **Desfazer**.

A tela da partida se ajusta ao número de pessoas e ocupa a tela inteira: com poucas pessoas, nomes, pontos e botões ficam grandes; com muitas, tudo fica mais compacto para caber sem rolar.

O **Caderninho** mostra os pontos de cada um, rodada a rodada. Os dados ficam guardados só no aparelho em que o placar está aberto.

## Pontos à mão

- **Partida já começada** (na tela inicial): para continuar no celular uma partida que começou no papel. Ligue a opção e coloque os pontos de agora de cada um.
- **Ajustar pontos** (no menu ⋯ durante a partida): para corrigir um engano. Quem ficar com 0 sai do jogo; quem voltar a ter pontos volta para a mesa. O ajuste aparece em azul no Caderninho e pode ser desfeito.

## Para mexer no código

- `app.html`: o app inteiro (tela, estilo e regras).
- `node ferramentas/servidor.mjs`: abre o app em http://localhost:5174 para testar no computador.
- `node testes/regras.test.mjs`: testes das regras de pontuação.
- `node ferramentas/publicar.mjs`: gera `docs/index.html`, que é a página que o GitHub Pages mostra. Depois é só fazer commit e push.
