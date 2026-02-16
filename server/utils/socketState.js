let ioInstance = null;
const userSockets = new Map();
const socketToUser = new Map();

const normalizeId = (value) => String(value || "").trim();

export const setSocketServer = (io) => {
  ioInstance = io;
};

export const addOnlineUser = (userId, socketId) => {
  const uid = normalizeId(userId);
  const sid = normalizeId(socketId);
  if (!uid || !sid) return false;

  const sockets = userSockets.get(uid) || new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(sid);
  userSockets.set(uid, sockets);
  socketToUser.set(sid, uid);

  return wasOffline;
};

export const removeOnlineUserBySocket = (socketId) => {
  const sid = normalizeId(socketId);
  const uid = socketToUser.get(sid);
  if (!uid) return { userId: null, becameOffline: false };

  socketToUser.delete(sid);
  const sockets = userSockets.get(uid);
  if (!sockets) return { userId: uid, becameOffline: true };

  sockets.delete(sid);
  if (sockets.size === 0) {
    userSockets.delete(uid);
    return { userId: uid, becameOffline: true };
  }

  userSockets.set(uid, sockets);
  return { userId: uid, becameOffline: false };
};

export const isUserOnline = (userId) => {
  const uid = normalizeId(userId);
  const sockets = userSockets.get(uid);
  return Boolean(sockets && sockets.size > 0);
};

export const emitToUser = (userId, event, payload) => {
  const uid = normalizeId(userId);
  if (!uid || !ioInstance) return false;

  const sockets = userSockets.get(uid);
  if (!sockets || sockets.size === 0) return false;

  sockets.forEach((socketId) => {
    ioInstance.to(socketId).emit(event, payload);
  });
  return true;
};
