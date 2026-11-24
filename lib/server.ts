import { parse } from 'url'

// Fix: handle undefined url and fix import path
// If you have a custom socket server file, import it correctly - adjust path as needed
// import { initSocketServer } from './socket-server'

export function handleRequest(req: any, res: any) {
  const parsedUrl = parse(req.url || '/', true)
  // ... your logic here
  return parsedUrl
}

// Dummy export to keep file valid if not used
export const server = { handleRequest }