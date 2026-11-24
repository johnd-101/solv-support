// @ts-ignore
import type { Server as IOServer } from 'socket.io'

export function initSocketServer(httpServer: any) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Server } = require('socket.io')
    const io = new Server(httpServer, {
      cors: { origin: '*' }
    })

    io.on('connection', (socket: any) => {
      console.log('socket connected', socket.id)
      socket.on('disconnect', () => {
        console.log('disconnected', socket.id)
      })
    })

    return io as unknown as IOServer
  } catch (e) {
    console.warn('socket.io not installed', e)
    return null as unknown as IOServer
  }
}

export default initSocketServer