#!/usr/bin/env node

/**
 * PCAPdroid UDP Listener Bridge
 * Receives UDP exports from PCAPdroid and forwards to connected HTTP clients
 * 
 * Usage: node scripts/udp-listener.js [UDP_PORT] [HTTP_PORT]
 * Defaults: UDP_PORT=5000, HTTP_PORT=5001
 */

const dgram = require('dgram');
const http = require('http');

const UDP_PORT = parseInt(process.argv[2] || '5000');
const HTTP_PORT = parseInt(process.argv[3] || '5001');

let clients = new Set();

// UDP Server - Receive PCAPdroid exports
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, rinfo) => {
  const data = msg.toString('utf8');
  console.log(`[UDP] Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
  
  // Broadcast raw data to all HTTP clients
  clients.forEach(res => {
    try {
      res.write(`data: ${data}\n\n`);
    } catch (e) {
      console.error('Client write error:', e.message);
      clients.delete(res);
    }
  });
});

udpServer.on('error', (err) => {
  console.error('UDP error:', err);
});

udpServer.on('listening', () => {
  const addr = udpServer.address();
  console.log(`UDP Server listening on ${addr.address}:${addr.port}`);
});

udpServer.bind(UDP_PORT, '0.0.0.0');

// HTTP Server - Stream UDP data to clients
const httpServer = http.createServer((req, res) => {
  if (req.url === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    clients.add(res);
    console.log(`Client connected. Total: ${clients.size}`);
    
    res.on('close', () => {
      clients.delete(res);
      console.log(`Client disconnected. Total: ${clients.size}`);
    });
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP Server listening on 0.0.0.0:${HTTP_PORT}`);
  console.log(`Streaming events at http://0.0.0.0:${HTTP_PORT}/stream`);
  console.log('\nReady for PCAPdroid exports!');
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  udpServer.close();
  httpServer.close();
  process.exit(0);
});
