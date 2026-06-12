import crypto from 'crypto'
import http from 'http'
import { shell } from 'electron'

export interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: string
  album_art: string
  is_playing: boolean
  progress_ms: number
  duration_ms: number
}

const SCOPES =
  'user-read-playback-state user-modify-playback-state user-read-currently-playing'

let _verifier = ''

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function generateVerifier(): string {
  return base64url(crypto.randomBytes(96))
}

function generateChallenge(verifier: string): string {
  return base64url(crypto.createHash('sha256').update(verifier).digest())
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = http.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as { port: number }
      srv.close(() => resolve(addr.port))
    })
  })
}

export async function startOAuthFlow(
  clientId: string,
  onCode: (code: string, port: number) => void
): Promise<void> {
  _verifier = generateVerifier()
  const challenge = generateChallenge(_verifier)
  const port = await getFreePort()

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
    const code = url.searchParams.get('code')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(
      '<html><body style="font-family:monospace;background:#0b1120;color:#4d9fff;padding:2rem">' +
        '<h2>⬡ Mission Control</h2><p>Connected to Spotify. You can close this tab.</p>' +
        '<script>window.close()</script></body></html>'
    )
    server.close()
    if (code) onCode(code, port)
  })

  server.listen(port, '127.0.0.1')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: `http://127.0.0.1:${port}/callback`,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES
  })

  shell.openExternal(`https://accounts.spotify.com/authorize?${params}`)
}

export async function exchangeCode(
  code: string,
  clientId: string,
  port: number
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `http://127.0.0.1:${port}/callback`,
    code_verifier: _verifier
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  const data = (await res.json()) as Record<string, unknown>
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_at: Date.now() + (data.expires_in as number) * 1000
  }
}

export async function refreshAccessToken(
  tokens: SpotifyTokens,
  clientId: string
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  const data = (await res.json()) as Record<string, unknown>
  return {
    access_token: data.access_token as string,
    refresh_token: (data.refresh_token as string | undefined) ?? tokens.refresh_token,
    expires_at: Date.now() + (data.expires_in as number) * 1000
  }
}

async function spotifyCall(
  path: string,
  token: string,
  opts: RequestInit = {}
): Promise<unknown> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {})
    }
  })
  if (res.status === 204 || res.status === 202 || res.status === 200 && res.headers.get('content-length') === '0')
    return null
  if (!res.ok) return null
  return res.json()
}

export async function getCurrentTrack(token: string): Promise<SpotifyTrack | null> {
  const data = (await spotifyCall('/me/player/currently-playing', token)) as Record<
    string,
    unknown
  > | null
  if (!data) return null
  const item = data.item as Record<string, unknown> | null
  if (!item) return null
  const artists = (item.artists as { name: string }[]).map((a) => a.name).join(', ')
  const images = ((item.album as Record<string, unknown>).images as { url: string }[])
  return {
    id: item.id as string,
    name: item.name as string,
    artists,
    album_art: images[0]?.url ?? '',
    is_playing: data.is_playing as boolean,
    progress_ms: data.progress_ms as number,
    duration_ms: item.duration_ms as number
  }
}

export async function spotifyPlay(token: string): Promise<void> {
  await spotifyCall('/me/player/play', token, { method: 'PUT' })
}

export async function spotifyPause(token: string): Promise<void> {
  await spotifyCall('/me/player/pause', token, { method: 'PUT' })
}

export async function spotifyNext(token: string): Promise<void> {
  await spotifyCall('/me/player/next', token, { method: 'POST' })
}

export async function spotifyPrev(token: string): Promise<void> {
  await spotifyCall('/me/player/previous', token, { method: 'POST' })
}
