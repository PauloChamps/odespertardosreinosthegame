(() => {
  const state = {
    myId: null,
    roomId: null,
    game: null,
    selectedTarget: null
  };

  const { els } = window.UI;

  function getName() {
    return (els.playerName.value || '').trim() || 'Jogador';
  }

  function roomLink(roomId) {
    return `${window.location.origin}?room=${roomId}`;
  }

  function joinRoom(roomId) {
    window.socket.emit('room:join', { roomId, name: getName() }, (res) => {
      if (res?.error) return window.UI.toast(res.error);
      state.roomId = roomId;
      els.roomCode.textContent = roomId;
      els.roomLink.value = roomLink(roomId);
      window.UI.show('lobby');
    });
  }

  function createRoom() {
    window.socket.emit('room:create', { name: getName() }, (res) => {
      if (res?.error) return window.UI.toast(res.error);
      state.roomId = res.roomId;
      els.roomCode.textContent = res.roomId;
      els.roomLink.value = roomLink(res.roomId);
      history.replaceState({}, '', `?room=${res.roomId}`);
      window.UI.show('lobby');
    });
  }

  function renderPlayers(data) {
    els.playersArea.innerHTML = '';
    data.players.forEach((player) => {
      const div = document.createElement('article');
      div.className = 'player';
      const isTurn = player.id === data.turnPlayerId;
      div.innerHTML = `
        <strong>${player.name} ${player.eliminated ? '☠️' : ''}</strong>
        <p>HP: ${player.hp}</p>
        <p>Florims: ${player.florims} | Lv: ${player.level}</p>
        <p>Campo: ${player.characters.length} personagens / ${player.magics.length} magias</p>
        <p>Armas: ${player.weapons.map((w) => w.name).join(', ') || 'Nenhuma'}</p>
        ${isTurn ? '<p><em>Jogador da vez</em></p>' : ''}
      `;
      const attackBtn = document.createElement('button');
      attackBtn.textContent = 'Selecionar alvo';
      attackBtn.onclick = () => {
        state.selectedTarget = player.id;
        window.UI.toast(`Alvo selecionado: ${player.name}`);
      };
      if (player.id !== state.myId && !player.eliminated) div.appendChild(attackBtn);
      els.playersArea.appendChild(div);
    });
  }

  function renderBoss(data) {
    if (!data.currentBoss) {
      els.bossArea.classList.add('hidden');
      els.bossArea.innerHTML = '';
      return;
    }

    els.bossArea.classList.remove('hidden');
    els.bossArea.innerHTML = `
      <h3>Boss: ${data.currentBoss.name}</h3>
      <p>HP: ${data.currentBoss.hp} / ${data.currentBoss.maxHp}</p>
    `;

    if (data.turnPlayerId === state.myId) {
      const select = document.createElement('select');
      data.currentBoss.attacks.forEach((attack) => {
        const option = document.createElement('option');
        option.value = attack.id;
        option.textContent = `${attack.name} (${attack.damage})`;
        select.appendChild(option);
      });

      const btn = document.createElement('button');
      btn.textContent = 'Executar ataque do Boss em mim';
      btn.onclick = () => {
        window.socket.emit('game:bossAttack', { attackId: select.value }, (res) => {
          if (res?.error) window.UI.toast(res.error);
        });
      };
      els.bossArea.appendChild(select);
      els.bossArea.appendChild(btn);
    }
  }

  function renderHand(data) {
    const me = data.players.find((p) => p.id === state.myId);
    els.handArea.innerHTML = '';
    if (!me?.hand) return;

    me.hand.forEach((card, index) => {
      const div = document.createElement('article');
      div.className = 'card';
      div.innerHTML = `
        <strong>${card.name}</strong>
        <p>Tipo: ${card.type}</p>
        <p>Ataque: ${card.attack || '-'} | Efeito: ${card.effect || '-'}</p>
      `;

      const playBtn = document.createElement('button');
      playBtn.textContent = 'Jogar carta';
      playBtn.onclick = () => {
        window.socket.emit('game:playCard', { cardIndex: index, targetPlayerId: state.selectedTarget }, (res) => {
          if (res?.error) window.UI.toast(res.error);
        });
      };

      const attackBtn = document.createElement('button');
      attackBtn.textContent = 'Atacar';
      attackBtn.onclick = () => {
        const attackValue = Number(prompt('Valor de ataque base?', card.attack || 100));
        if (Number.isNaN(attackValue)) return;
        const targetPlayerId = state.selectedTarget || (data.currentBoss ? 'boss' : null);
        if (!targetPlayerId) return window.UI.toast('Selecione um alvo ou ataque o boss.');

        window.socket.emit('game:attack', { targetPlayerId, attackValue }, (res) => {
          if (res?.error) window.UI.toast(res.error);
        });
      };

      div.appendChild(playBtn);
      div.appendChild(attackBtn);
      els.handArea.appendChild(div);
    });
  }

  function renderLog(data) {
    els.logArea.innerHTML = '';
    data.log.forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = entry;
      els.logArea.appendChild(li);
    });
  }

  function render(data) {
    state.game = data;
    els.roundInfo.textContent = data.round;
    const turnPlayer = data.players.find((p) => p.id === data.turnPlayerId);
    els.turnInfo.textContent = turnPlayer ? turnPlayer.name : '-';

    renderPlayers(data);
    renderBoss(data);
    renderHand(data);
    renderLog(data);

    if (data.started) window.UI.show('game');

    if (data.winnerId) {
      const winner = data.players.find((p) => p.id === data.winnerId);
      window.UI.toast(`Partida encerrada! Vencedor: ${winner?.name || 'Desconhecido'}`);
    }
  }

  function bindEvents() {
    els.createRoomBtn.onclick = createRoom;
    els.joinRoomBtn.onclick = () => {
      const id = (els.roomIdInput.value || '').trim();
      if (!id) return window.UI.toast('Informe o ID da sala.');
      joinRoom(id);
    };

    els.copyLinkBtn.onclick = async () => {
      await navigator.clipboard.writeText(els.roomLink.value);
      window.UI.toast('Link copiado!');
    };

    els.startGameBtn.onclick = () => {
      window.socket.emit('game:start', {}, (res) => {
        if (res?.error) window.UI.toast(res.error);
      });
    };

    els.endTurnBtn.onclick = () => {
      window.socket.emit('game:endTurn', {}, (res) => {
        if (res?.error) window.UI.toast(res.error);
      });
    };
  }

  function initSocket() {
    state.myId = window.socket.id;
    window.socket.on('connect', () => {
      state.myId = window.socket.id;
    });

    window.socket.on('game:state', render);
  }

  function init() {
    bindEvents();
    initSocket();

    const url = new URL(window.location.href);
    const room = url.searchParams.get('room');
    if (room) {
      els.roomIdInput.value = room;
    }
  }

  init();
})();
