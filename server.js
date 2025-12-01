const dgram = require('dgram');
const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 5000;
let wsServer;
let activeConnections = new Set();

// Parse PCAPdroid TCP/UDP export format
function parsePCAPdroidExport(buffer) {
  try {
    const data = buffer.toString('utf8');
    // PCAPdroid can send data in various formats
    // Try JSON first
    try {
      return JSON.parse(data);
    } catch {
      // If not JSON, try to parse as raw format
      // PCAPdroid sends: METHOD HOST:PORT /path headers body
      const lines = data.split('\n');
      if (lines.length < 2) return null;
      
      const firstLine = lines[0];
      const [method, hostPort] = firstLine.split(' ');
      const [host, port] = hostPort.split(':');
      const path = lines[1] || '/';
      
      const headers = {};
      let bodyStart = 2;
      for (let i = 2; i < lines.length; i++) {
        if (lines[i].trim() === '') {
          bodyStart = i + 1;
          break;
        }
        const [key, value] = lines[i].split(': ');
        if (key && value) headers[key] = value;
      }
      
      const body = lines.slice(bodyStart).join('\n');
      
      return {
        method,
        host,
        port: parseInt(port) || 443,
        path,
        protocol: parseInt(port) === 443 ? 'HTTPS' : 'HTTP',
        headers,
        body,
        ip: '127.0.0.1', // Will be overridden by UDP sender IP
      };
    }
  } catch (e) {
    console.error('Parse error:', e.message);
    return null;
  }
}

// UDP Server
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, rinfo) => {
  const request = parsePCAPdroidExport(msg);
  if (request) {
    request.ip = rinfo.address;
    request.timestamp = Date.now();
    request.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Broadcast to all WebSocket clients
    activeConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'request',
          data: request
        }));
      }
    });
  }
});

udpServer.on('error', (err) => {
  console.error('UDP error:', err);
});

udpServer.on('listening', () => {
  console.log(`PCAPdroid listener on 127.0.0.1:${PORT} (UDP)`);
});

udpServer.bind(PORT, '127.0.0.1');

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
  console.log('Client connected. Total:', activeConnections.size);
  
  ws.send(JSON.stringify({
    type: 'connected',
    port: PORT,
    message: 'Connected to PCAPdroid listener'
  }));
  
  ws.on('close', () => {
    activeConnections.delete(ws);
    console.log('Client disconnected. Total:', activeConnections.size);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    activeConnections.delete(ws);
  });
});

const WS_PORT = 5001;
server.listen(WS_PORT, '127.0.0.1', () => {
  console.log(`WebSocket server on 127.0.0.1:${WS_PORT}`);
  console.log(`Waiting for PCAPdroid exports on 127.0.0.1:${PORT}...`);
});
