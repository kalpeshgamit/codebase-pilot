// src/ui/ws.ts — Native WebSocket server (zero deps, RFC 6455)
// Handles upgrade from HTTP → WS, sends JSON frames to all connected clients.

import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class WsServer {
  private clients = new Set<Socket>();

  /** Call this from server.on('upgrade', ...) */
  handleUpgrade(req: IncomingMessage, socket: Socket): void {
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }

    const accept = createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );

    this.clients.add(socket);

    // Send welcome frame
    this.sendTo(socket, JSON.stringify({ event: 'connected', data: { time: new Date().toISOString() } }));

    socket.on('data', (buf) => {
      // Handle ping frames (opcode 9) → send pong (opcode 10)
      if (buf.length >= 2 && (buf[0] & 0x0f) === 9) {
        const pong = Buffer.alloc(2);
        pong[0] = 0x8a; pong[1] = 0x00;
        try { socket.write(pong); } catch { /* ignore */ }
      }
      // Handle close frames (opcode 8)
      if (buf.length >= 2 && (buf[0] & 0x0f) === 8) {
        this.clients.delete(socket);
        socket.destroy();
      }
    });

    socket.on('close', () => this.clients.delete(socket));
    socket.on('error', () => { this.clients.delete(socket); socket.destroy(); });
  }

  /** Broadcast a named event to all WS clients */
  broadcast(event: string, data: unknown): void {
    const payload = JSON.stringify({ event, data });
    for (const socket of this.clients) {
      this.sendTo(socket, payload);
    }
  }

  get size(): number { return this.clients.size; }

  private sendTo(socket: Socket, text: string): void {
    try {
      const buf = Buffer.from(text, 'utf8');
      const len = buf.length;
      let header: Buffer;
      if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81; // FIN + text opcode
        header[1] = len;
      } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
      }
      socket.write(Buffer.concat([header, buf]));
    } catch {
      this.clients.delete(socket);
    }
  }
}
