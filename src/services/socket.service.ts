import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import Ride from "../modules/ride/Rides";
import DriverUser from "../modules/driver/DriverUserAccounts";

const pendingChats = new Map<string, { socketId: string, userName: string, trackingId: string }>();
const activeRooms = new Map<string, { userSocketId: string, adminSocketId: string }>();

export const initSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {

  socket.on('registerAsAdmin', async ({ adminId, adminName }: {adminId: string, adminName: string}) => {
    socket.data.isAdmin = true;
    socket.data.adminId = adminId || `admin-${socket.id}`;
    socket.data.adminName = adminName || 'Admin';

    try {
      // 1. Get all trackingIds from pending chats
      const allPending = Array.from(pendingChats.entries());
      const trackingIds = allPending.map(([_, val]) => val.trackingId);

      // 2. Find rides that belong to this admin
      const rides = await Ride.find({
        _id: { $in: trackingIds },
        adminId: socket.data.adminId
      }).select('_id'); // only need the IDs

      const validTrackingIds = new Set(
        rides.map(r => (r._id as mongoose.Types.ObjectId).toString())
      );

      // 3. Filter pending chats accordingly
      const filteredList = allPending
        .filter(([_, val]) => validTrackingIds.has(val.trackingId.toString()))
        .map(([userId, val]) => ({
          userId,
          userName: val.userName || userId,
          trackingId: val.trackingId
        }));

      // 4. Send to admin
      socket.emit('pendingList', filteredList);

    } catch (err) {
      console.error('Error filtering pending chats for admin:', err);
      socket.emit('pendingList', []); // fallback
    }
  });

  socket.on('chatRequest', async ({ userId, userName, trackingId }: { userId?: string, userName?: string, trackingId?: string } = {}) => {
    if (!userId || !trackingId) return;

    trackingId = trackingId.trim()
    pendingChats.set(userId, { socketId: socket.id, userName: userName || userId, trackingId });

    const ride = await Ride.findById(trackingId);

    if (!ride) return;

    // Find which admin(s) are linked to this ride
    const targetAdminId = String(ride.adminId);

    io.sockets.sockets.forEach((s) => {
      if (s.data?.isAdmin && s.data.adminId === targetAdminId) {
        s.emit('newChatRequest', { userId, userName: userName || userId, trackingId });
      }
    });

    socket.emit('waitingForAdmin');
  });

  socket.on('acceptChat', ({ userId, adminId, adminName }: { userId?: string, adminId?: string, adminName?: string } = {}) => {
    if (!userId) return;

    const pending = pendingChats.get(userId);
    if (!pending) {
      socket.emit('acceptFailed', { reason: 'Request not available (maybe already accepted).' });
      return;
    }

    const userSocketId = pending.socketId;
    const userSocket = io.sockets.sockets.get(userSocketId);
    if (!userSocket) {
      socket.emit('acceptFailed', { reason: 'User disconnected.' });
      pendingChats.delete(userId);

      io.sockets.sockets.forEach((s) => {
        if (s.data && s.data.isAdmin) s.emit('removePending', { userId });
      });

      return;
    }

    const roomId = `${userId}-${adminId}-${Date.now()}`;
    activeRooms.set(roomId, { userSocketId, adminSocketId: socket.id });

    socket.join(roomId);
    userSocket.join(roomId);

    io.to(roomId).emit('chatStarted', {
      roomId,
      userId,
      adminId,
      adminName: adminName || socket.data.adminName || 'Admin'
    });

    pendingChats.delete(userId);
    io.sockets.sockets.forEach((s) => {
      if (s.data && s.data.isAdmin) s.emit('removePending', { userId });
    });
  });

  socket.on('sendMessage', ({ roomId, sender, text }: { roomId?: string, sender?: string, text?: string } = {}) => {
    if (roomId) {
      io.to(roomId).emit('receiveMessage', { sender, text, ts: Date.now() });
    }
  });

  socket.on('endChat', ({ roomId, by }: { roomId?: string, by?: string } = {}) => {
    if (!roomId) return;
    const info = activeRooms.get(roomId);
    if (info) {
      io.to(roomId).emit('chatEnded', { roomId, by });

      const clients = io.sockets.adapter.rooms.get(roomId);
      if (clients) {
        for (const clientId of clients) {
          const s = io.sockets.sockets.get(clientId);
          if (s) s.leave(roomId);
        }
      }
      activeRooms.delete(roomId);
    }
  });

  // driver socket handlers can go here
  // Only drivers emit this event
  socket.on('driver:location', async ({ driverId, lat, lng, ts }: { driverId: string, lat: number, lng: number, ts?: number }) => {
    if (!driverId || typeof lat !== 'number' || typeof lng !== 'number') return;
    console.log(`Received location from driver ${driverId}: (${lat}, ${lng}) at ${ts || Date.now()}`);
    // Optional: save to MongoDB
    try {
      // Update the ride's last known location
      const updatedRide = await Ride.updateMany(
        { driverId },
        { $set: { lastDriverLocation: { lat, lng, ts: ts || Date.now() } } }
      );
      if (!updatedRide) {
        console.log("No ride found for driver:", driverId);
      }
      console.log("Updated Ride:", updatedRide);
      // Update the driver's current location
      await DriverUser.findByIdAndUpdate(driverId, {
        $set: {
          currentLoc: { lat, lng },
          updatedAt: new Date()
        }
      });


    } catch (err) {
      console.error('Error saving driver location:', err);
    }

    // Broadcast only to admins
    console.log(`Broadcasting driver location to ${io.sockets.sockets.size} sockets`);
    io.emit('driver:location', { driverId, lat, lng, ts: ts || Date.now() });


  });
  //// driver socket handlers ends here

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);

    for (const [userId, val] of pendingChats.entries()) {
      if (val.socketId === socket.id) {
        pendingChats.delete(userId);
        io.sockets.sockets.forEach((s) => {
          if (s.data && s.data.isAdmin) s.emit('removePending', { userId });
        });
      }
    }

    for (const [roomId, val] of activeRooms.entries()) {
      if (val.userSocketId === socket.id || val.adminSocketId === socket.id) {
        io.to(roomId).emit('chatEnded', { roomId, by: 'disconnect' });
        activeRooms.delete(roomId);
      }
    }
  });
});
};
