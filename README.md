# O Despertar dos Reinos

Projeto multiplayer online de cartas para navegador, com backend em Node.js e comunicação em tempo real via Socket.io.

## Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Multiplayer: Socket.io (WebSockets)

## Estrutura

```txt
/server
  server.js
  gameEngine.js
  bossSystem.js
  playerSystem.js
/client
  index.html
  style.css
  game.js
  socket.js
  ui.js
/shared
  cards.js
  rules.js
  bosses.js
package.json
README.md
```

## Funcionalidades implementadas

- Criar sala de jogo
- Gerar e compartilhar link da sala
- Entrar em sala via link/ID
- Suporte a 2–4 jogadores
- Sistema de turnos (com bloqueio de ataque na rodada 1)
- Compra de 1 carta por turno
- Campo com limites de personagens e magias
- Sistema de HP e eliminação
- Boss aparecendo a cada 3 rodadas
- Escolha de ataque do boss pelo jogador da vez
- Sistema de florims, XP e níveis
- Recompensas por boss, eliminação, vitória e derrota

## Como rodar

```bash
npm install
npm start
```

Acesse: `http://localhost:3000`

## Observações

- As regras completas foram mapeadas a partir dos requisitos fornecidos nesta conversa.
- O projeto está modular para facilitar evolução futura (cartas, regras e bosses no diretório `/shared`).
