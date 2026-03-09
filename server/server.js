const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const GameEngine = require('./gameEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = new Map();

app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/health', (req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new GameEngine(roomId));
  }
  return rooms.get(roomId);
}

function emitRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.forEach((player) => {
    io.to(player.id).emit('game:state', room.serializeForPlayer(player.id));
  });
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ name }, cb) => {
    const roomId = Math.random().toString(36).slice(2, 8);
    const room = getOrCreateRoom(roomId);
    const result = room.addPlayer({ socketId: socket.id, name: name || 'Jogador' });

    if (result.error) {
      cb?.({ error: result.error });
      return;
    }

    socket.data.roomId = roomId;
    socket.join(roomId);
    emitRoomState(roomId);
    cb?.({ roomId });
  });

  socket.on('room:join', ({ roomId, name }, cb) => {
    const room = rooms.get(roomId);
    if (!room) {
      cb?.({ error: 'Sala não encontrada.' });
      return;
    }

    const result = room.addPlayer({ socketId: socket.id, name: name || 'Jogador' });
    if (result.error) {
      cb?.({ error: result.error });
      return;
    }

    socket.data.roomId = roomId;
    socket.join(roomId);
    emitRoomState(roomId);
    cb?.({ roomId });
  });

  socket.on('game:start', (_, cb) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return cb?.({ error: 'Sala inválida.' });

    const result = room.startGame();
    emitRoomState(roomId);
    cb?.(result.error ? { error: result.error } : { ok: true });
  });

  socket.on('game:playCard', (payload, cb) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return cb?.({ error: 'Sala inválida.' });

    const result = room.playCard({ playerId: socket.id, ...payload });
    emitRoomState(socket.data.roomId);
    cb?.(result);
  });

  socket.on('game:attack', (payload, cb) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return cb?.({ error: 'Sala inválida.' });

    const result = room.attack({ playerId: socket.id, ...payload });
    emitRoomState(socket.data.roomId);
    cb?.(result);
  });

  socket.on('game:bossAttack', (payload, cb) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return cb?.({ error: 'Sala inválida.' });

    const result = room.bossAttack({ playerId: socket.id, ...payload });
    emitRoomState(socket.data.roomId);
    cb?.(result);
  });

  socket.on('game:endTurn', (_, cb) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return cb?.({ error: 'Sala inválida.' });

    const current = room.getCurrentPlayer();
    if (!current || current.id !== socket.id) {
      cb?.({ error: 'Somente o jogador da vez pode passar turno.' });
      return;
    }

    const result = room.nextTurn();
    emitRoomState(socket.data.roomId);
    cb?.(result);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.removePlayer(socket.id);

    if (!room.players.length) {
      rooms.delete(roomId);
      return;
    }

    emitRoomState(roomId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
