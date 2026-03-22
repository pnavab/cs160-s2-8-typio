import type { IncomingMessage } from 'node:http'

export async function parseJsonBody<T = unknown>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf-8')
  return JSON.parse(raw || '{}') as T
}
