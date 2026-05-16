/**
 * Multi-Platform Video Downloader - Backend Server
 * Express + WebSocket server يشغّل yt-dlp
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const apiRoutes = require('./routes/api');
const { logInfo, logSuccess } = require('./services/logger');
const { checkRequirements } = require('./services/downloader');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for downloads
app.use('/files', express.static(path.join(__dirname, 'downloads')));

// API Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Multi-Platform Video Downloader API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      platforms: 'GET /api/platforms',
      detect: 'POST /api/detect',
      info: 'POST /api/info',
      download: 'POST /api/download',
      formats: 'POST /api/formats',
      playlistInfo: 'POST /api/playlist/info',
      downloads: 'GET /api/downloads',
      logs: 'GET /api/logs',
    },
  });
});

// HTTP Server
const server = http.createServer(app);

// WebSocket Server - للتقدم المباشر
const wss = new WebSocketServer({ server, path: '/ws' });

const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  logInfo(`WebSocket client connected (total: ${wsClients.size})`);

  ws.on('close', () => {
    wsClients.delete(ws);
    logInfo(`WebSocket client disconnected (total: ${wsClients.size})`);
  });

  ws.on('error', (err) => {
    logInfo(`WebSocket error: ${err.message}`);
    wsClients.delete(ws);
  });

  // رسالة ترحيب
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Download Server' }));
});

// Global broadcast function for download progress
global.wsBroadcast = (message) => {
  for (const client of wsClients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
      } catch (e) {
        wsClients.delete(client);
      }
    }
  }
};

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  console.log('');
  console.log('\x1b[36m╔══════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║                                                          ║\x1b[0m');
  console.log('\x1b[36m║   🎬  Multi-Platform Video Downloader - Server v1.0  🎬  ║\x1b[0m');
  console.log('\x1b[36m║                                                          ║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════════════════════╝\x1b[0m');
  console.log('');
  console.log(`\x1b[32m✅ HTTP Server:    http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[32m✅ WebSocket:      ws://localhost:${PORT}/ws\x1b[0m`);
  console.log(`\x1b[32m✅ API Docs:       http://localhost:${PORT}/\x1b[0m`);
  console.log('');

  // فحص المتطلبات
  const reqs = await checkRequirements();
  if (reqs.ytdlp) {
    console.log('\x1b[32m✅ yt-dlp:         Installed\x1b[0m');
  } else {
    console.log('\x1b[31m❌ yt-dlp:         Not installed! Run: pip install -U yt-dlp\x1b[0m');
  }
  if (reqs.ffmpeg) {
    console.log('\x1b[32m✅ ffmpeg:         Installed\x1b[0m');
  } else {
    console.log('\x1b[31m❌ ffmpeg:         Not installed! Run: brew install ffmpeg\x1b[0m');
  }
  console.log('');

  logSuccess(`Server started on port ${PORT}`);
});
