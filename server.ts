import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'lapas-kediri-secret-key';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API Routes ---
  
  // Login Endpoint
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'lapaskediri' && password === 'kediri2026') {
      const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Username atau password salah' });
    }
  });

  // Middleware to protect admin routes
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, JWT_SECRET);
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

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
  app.post('/api/guests/:id/checkout', requireAdmin, async (req, res) => {
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
  app.get('/api/guests/active', requireAdmin, async (req, res) => {
    try {
      const guests = await prisma.guest.findMany({
        where: { checkOut: null },
        orderBy: { checkIn: 'desc' },
        select: { id: true, name: true, nik: true, instansi: true, keperluan: true, checkIn: true, checkOut: true, token: true, photoUrl: true }
      });
      res.json(guests);
    } catch (err) {
      console.error('Fetch active guests error:', err);
      res.status(500).json({ error: 'Failed to fetch active guests' });
    }
  });
  
  // Get all guests (history)
  app.get('/api/guests/history', requireAdmin, async (req, res) => {
    try {
      const guests = await prisma.guest.findMany({
        orderBy: { checkIn: 'desc' },
        select: { id: true, name: true, nik: true, instansi: true, keperluan: true, checkIn: true, checkOut: true, token: true, photoUrl: true }
      });
      res.json(guests);
    } catch (err) {
      console.error('Fetch history error:', err);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // Generate QR Token
  app.post('/api/qr/generate', requireAdmin, async (req, res) => {
    try {
      const { validHours = 24 } = req.body;
      const token = jwt.sign({ type: 'qr_checkin' }, JWT_SECRET, { expiresIn: `${validHours}h` });
      const expiredAt = new Date(Date.now() + validHours * 60 * 60 * 1000);
      res.json({ token, expiredAt });
    } catch(err) {
      console.error('Generate QR error:', err);
      res.status(500).json({ error: 'Failed to generate QR token' });
    }
  });

  // Validate QR Token
  app.get('/api/qr/validate', (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, error: 'Token missing' });
      }
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded.type !== 'qr_checkin') {
          return res.json({ valid: false, reason: 'invalid_type' });
        }
        return res.json({ valid: true });
      } catch(err) {
        return res.json({ valid: false, reason: 'unauthorized_or_expired' });
      }
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
    
    // Explicit SPA fallback
    const fs = await import('fs');
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        let template = await fs.promises.readFile(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

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
