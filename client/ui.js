window.UI = {
  els: {
    home: document.getElementById('homeScreen'),
    lobby: document.getElementById('lobbyScreen'),
    game: document.getElementById('gameScreen'),
    playerName: document.getElementById('playerName'),
    roomIdInput: document.getElementById('roomIdInput'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    joinRoomBtn: document.getElementById('joinRoomBtn'),
    startGameBtn: document.getElementById('startGameBtn'),
    roomCode: document.getElementById('roomCode'),
    roomLink: document.getElementById('roomLink'),
    copyLinkBtn: document.getElementById('copyLinkBtn'),
    endTurnBtn: document.getElementById('endTurnBtn'),
    roundInfo: document.getElementById('roundInfo'),
    turnInfo: document.getElementById('turnInfo'),
    playersArea: document.getElementById('playersArea'),
    handArea: document.getElementById('handArea'),
    logArea: document.getElementById('logArea'),
    bossArea: document.getElementById('bossArea')
  },

  show(screen) {
    ['home', 'lobby', 'game'].forEach((key) => {
      this.els[key].classList.toggle('hidden', key !== screen);
    });
  },

  toast(message) {
    window.alert(message);
  }
};
