'use client'
// @ts-ignore - optional dependency
import type { Socket } from 'socket.io-client'
// Use dynamic import to avoid build error if package not installed
let io: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  io = require('socket.io-client').io
} catch {}

export function getSocketClient(url?: string) {
  if (!io) {
    console.warn('socket.io-client not installed - skipping')
    return null as unknown as Socket
  }
  return io(url || 'http://localhost:3000') as Socket
}

export default getSocketClient