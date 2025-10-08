import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';
import driverRoutes from './routes/driverRoutes';
import Ride from './models/Rides';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server, Socket } from 'socket.io';
import faqRoutes from './routes/faq';
import nodemailer from 'nodemailer'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json()); // parse JSON body
app.use(cookieParser());
app.use('/AdminUser', userRoutes);
app.use('/DriverUser', driverRoutes);
// Test route
app.get('/', (req: Request, res: Response) => {
  res.send('MERN backend is running');
});

app.post("/api/send-email", async (req: Request, res: Response) => {
  const { to, subject, text } = req.body;

  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "rajcompany1kl@gmail.com", // Replace with your Gmail
        pass: "tnni pgme ambt klll",   // Use App Password, not regular password
      },
    });

    await transporter.sendMail({
      from: '"Delivery System" <rajcompany1kl@gmail.com>',
      to,
      subject,
      text,
    });

    res.status(200).json({ message: "Email sent" });
  } catch (err) {
    console.error("Email send failed:", err);
    res.status(500).json({ error: "Email failed to send" });
  }
});

///// sockets

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});
const pendingChats = new Map<string, { socketId: string, userName: string, trackingId: string }>();
const activeRooms = new Map<string, { userSocketId: string, adminSocketId: string }>();

io.on('connection', (socket: Socket) => {
  console.log('Socket connected', socket.id);

  socket.on('registerAsAdmin', ({ adminId, adminName }: { adminId?: string, adminName?: string } = {}) => {
    socket.data.isAdmin = true;
    socket.data.adminId = adminId || `admin-${socket.id}`;
    socket.data.adminName = adminName || 'Admin';

    const list = Array.from(pendingChats.entries()).map(([userId, val]) => ({
      userId,
      userName: val.userName || userId,
      trackingId: val.trackingId
    }));
    socket.emit('pendingList', list);
  });

  socket.on('chatRequest', async ({ userId, userName, trackingId }: { userId?: string, userName?: string, trackingId?: string } = {}) => {
    if (!userId || !trackingId) return;
    console.log('Chat request from', userId, userName);
    trackingId = trackingId.trim()
    pendingChats.set(userId, { socketId: socket.id, userName: userName || userId, trackingId });
    console.log('trackingId:', trackingId);
    // trackingId corresponds to Ride._id
    const ride = await Ride.findById(trackingId);
    console.log('Looking for ride with ID:', trackingId);

    console.log('Ride found:', ride);

    if (!ride) return;

    // Find which admin(s) are linked to this ride
    const targetAdminId = String(ride.adminId);
    console.log('Target admin ID:', targetAdminId);

    io.sockets.sockets.forEach((s) => {
      if (s.data?.isAdmin && s.data.adminId === targetAdminId) {
        console.log('Found matching admin socket:', s.id);
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

app.use('/api/faq', faqRoutes);

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in the environment variables");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Start the combined HTTP & Socket.IO server instead of app.listen()
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error(err));