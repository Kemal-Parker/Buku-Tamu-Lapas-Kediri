import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.use(express.json());

  // --- API Routes ---
  
  // Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Check-in (Add Guest)
  app.post('/api/guests/checkin', async (req, res) => {
    try {
      const { name, nik, instansi, keperluan, photoUrl, token } = req.body;
      
      const guest = await prisma.guest.create({
        data: {
          name,
          nik,
          instansi,
          keperluan,
          photoUrl,
          token
        }
      });
      
      // Real-time update
      io.emit('guest:checked-in', guest);
      res.json(guest);
    } catch (err: any) {
      console.error('Checkin error:', err);
      res.status(500).json({ error: 'Failed to check in' });
    }
  });

  // Check-out Guest
  app.post('/api/guests/:id/checkout', async (req, res) => {
    try {
      const { id } = req.params;
      const guest = await prisma.guest.update({
        where: { id },
        data: { checkOut: new Date() }
      });
      
      io.emit('guest:checked-out', guest);
      res.json(guest);
    } catch (err: any) {
      console.error('Checkout error:', err);
      res.status(500).json({ error: 'Failed to check out' });
    }
  });

  // Get active guests (inside LAPAS)
  app.get('/api/guests/active', async (req, res) => {
    try {
      const guests = await prisma.guest.findMany({
        where: { checkOut: null },
        orderBy: { checkIn: 'desc' }
      });
      res.json(guests);
    } catch (err) {
      console.error('Fetch active guests error:', err);
      res.status(500).json({ error: 'Failed to fetch active guests' });
    }
  });
  
  // Get all guests (history)
  app.get('/api/guests/history', async (req, res) => {
    try {
      const guests = await prisma.guest.findMany({
        orderBy: { checkIn: 'desc' }
      });
      res.json(guests);
    } catch (err) {
      console.error('Fetch history error:', err);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // Generate QR Token
  app.post('/api/qr/generate', async (req, res) => {
    try {
      const { validHours = 24 } = req.body;
      // Using UUID as a simple secure token for now. In real app, might be signed JWT.
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiredAt = new Date(Date.now() + validHours * 60 * 60 * 1000);
      
      const qrToken = await prisma.qrToken.create({
        data: { token, expiredAt }
      });
      
      // Provide full URL assuming app is hosted at frontend origin
      // In production, we'd use process.env.APP_URL
      res.json({ token: qrToken.token, expiredAt: qrToken.expiredAt });
    } catch(err) {
      console.error('Generate QR error:', err);
      res.status(500).json({ error: 'Failed to generate QR token' });
    }
  });

  // Validate QR Token
  app.get('/api/qr/validate', async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, error: 'Token missing' });
      }
      
      const qrToken = await prisma.qrToken.findUnique({ where: { token } });
      if (!qrToken || !qrToken.active) {
        return res.json({ valid: false, reason: 'invalid_or_inactive' });
      }
      
      if (new Date() > qrToken.expiredAt) {
         return res.json({ valid: false, reason: 'expired' });
      }
      
      return res.json({ valid: true });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to validate QR' });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Socket.IO event handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
