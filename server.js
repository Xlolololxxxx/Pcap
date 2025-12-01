const dgram = require('dgram');
const WebSocket = require('ws');
const http = require('http');

const UDP_PORT = process.env.UDP_PORT || 5000;
const WS_PORT = process.env.WS_PORT || 5001;

let wsServer;
let activeConnections = new Set();

// UDP Server - just receive and forward
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, rinfo) => {
  // Forward raw data to all WebSocket clients
  activeConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(msg);
      } catch (e) {
        console.error('Send error:', e.message);
      }
    }
  });
});

udpServer.on('error', (err) => {
  console.error('UDP error:', err);
});

udpServer.on('listening', () => {
  console.log(`UDP listener on 127.0.0.1:${UDP_PORT}`);
});

udpServer.bind(UDP_PORT, '127.0.0.1');

// HTTP + WebSocket Server
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

wsServer = new WebSocket.Server({ server });

wsServer.on('connection', (ws) => {
  activeConnections.add(ws);
  console.log(`Client connected. Total: ${activeConnections.size}`);
  
  ws.on('close', () => {
    activeConnections.delete(ws);
    console.log(`Client disconnected. Total: ${activeConnections.size}`);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    activeConnections.delete(ws);
  });
});

server.listen(WS_PORT, '127.0.0.1', () => {
  console.log(`WebSocket server on 127.0.0.1:${WS_PORT}`);
});
