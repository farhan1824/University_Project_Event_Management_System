require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { setupSocketIO } = require('./socket/socketHandler');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Cross-Origin Resource Sharing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.use(express.json());

// Setup Socket.io for Real-time chat & live status sync
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Pass IO instance to socket handler
setupSocketIO(io);

// Attach io to req for controllers if needed
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Register Modular API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/events', require('./routes/event.routes'));
app.use('/api/departments', require('./routes/department.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/issues', require('./routes/issue.routes'));
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/activities', require('./routes/activity.routes'));

// Root Welcome Route & API Documentation
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>EventOps Server API</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.1); max-width: 520px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; }
        .badge { display: inline-block; background: #22c55e; color: #fff; font-size: 0.75rem; font-weight: bold; padding: 0.25rem 0.75rem; border-radius: 9999px; margin-bottom: 1rem; }
        h1 { margin: 0 0 0.5rem; font-size: 1.75rem; }
        p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin: 0 0 1.5rem; }
        .btn { display: inline-block; background: #3b82f6; color: white; padding: 0.8rem 1.75rem; border-radius: 0.75rem; text-decoration: none; font-weight: bold; font-size: 0.95rem; box-shadow: 0 10px 15px -3px rgba(59,130,246,0.3); transition: all 0.2s; }
        .btn:hover { background: #2563eb; transform: translateY(-1px); }
        .links { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: center; gap: 1rem; font-size: 0.8rem; }
        .links a { color: #38bdf8; text-decoration: none; }
        .links a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">● Server Active & WebSockets Ready</span>
        <h1>🍃 EventOps MongoDB API Server</h1>
        <p>This is the backend REST & Socket.io server running on <code>http://localhost:5000</code> backed by <strong>MongoDB</strong>.</p>
        <a href="http://localhost:3000" class="btn">🚀 Open React Frontend App (Port 3000)</a>
        <div class="links">
          <a href="/api/health" target="_blank">Health Check</a>
          <a href="/api/events" target="_blank">Events API</a>
          <a href="/api/auth/users" target="_blank">Users API</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Event Operations MongoDB Server is running',
    database: 'MongoDB (Mongoose)',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Event Operations Server running on http://localhost:${PORT}`);
  console.log(`🍃 Persistence Layer: MongoDB (Mongoose)`);
  console.log(`⚡ WebSockets ready for real-time collaboration`);
  console.log(`====================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} in use, waiting for release...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    console.error('[Server Error]:', err);
  }
});

process.on('SIGINT', () => {
  io.close();
  server.close(() => {
    process.exit(0);
  });
});
