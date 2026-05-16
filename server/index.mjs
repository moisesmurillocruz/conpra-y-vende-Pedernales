import { createHash } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { createServer } from 'node:http'

const port = Number(process.env.PORT ?? 4173)
const publicDir = resolve('dist')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

async function readJson(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const body = Buffer.concat(chunks).toString('utf8')
  return body ? JSON.parse(body) : {}
}

async function handleLogin(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'method_not_allowed' })
    return
  }

  try {
    const { email = '', password = '' } = await readJson(request)
    const ownerEmailHash = process.env.OWNER_EMAIL_SHA256
    const ownerPasswordHash = process.env.OWNER_PASSWORD_SHA256
    const hasOwnerConfig = Boolean(ownerEmailHash && ownerPasswordHash)
    const ownerMatches =
      hasOwnerConfig &&
      hash(String(email).trim().toLowerCase()) === ownerEmailHash &&
      hash(String(password)) === ownerPasswordHash

    sendJson(response, 200, {
      role: ownerMatches ? 'owner' : 'user',
      ownerAuthConfigured: hasOwnerConfig,
    })
  } catch {
    sendJson(response, 400, { error: 'invalid_request' })
  }
}

function serveStatic(request, response) {
  const requestedPath = new URL(request.url ?? '/', `http://${request.headers.host}`).pathname
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = join(publicDir, safePath === '/' ? 'index.html' : safePath)
  const resolvedPath = resolve(filePath)
  const assetPath = resolvedPath.startsWith(publicDir) && existsSync(resolvedPath)
    ? resolvedPath
    : join(publicDir, 'index.html')
  const extension = extname(assetPath)

  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  })
  createReadStream(assetPath).pipe(response)
}

createServer((request, response) => {
  if (request.url?.startsWith('/api/auth/login')) {
    void handleLogin(request, response)
    return
  }

  serveStatic(request, response)
}).listen(port, () => {
  console.log(`Compra y venta pedernales escuchando en http://localhost:${port}`)
})
