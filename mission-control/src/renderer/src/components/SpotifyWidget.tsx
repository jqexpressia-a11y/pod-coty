import { useEffect, useState } from 'react'
import { type SpotifyTrack } from '../types'

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function SpotifyWidget() {
  const [track, setTrack] = useState<SpotifyTrack | null>(null)
  const [connected, setConnected] = useState(false)
  const [hasClientId, setHasClientId] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.spotifyConnected().then(({ connected: c, hasClientId: h }) => {
      setConnected(c)
      setHasClientId(h)
    })

    if (connected) {
      window.api.spotifyStatus().then((t) => { if (t) setTrack(t) })
    }

    const off = window.api.onSpotifyUpdate((t) => {
      setTrack(t)
      setConnected(true)
    })

    return off
  }, [connected])

  async function handleConnect() {
    setConnecting(true)
    setError('')
    try {
      await window.api.spotifyAuthStart()
      const off = window.api.onSpotifyAuthComplete((r) => {
        setConnecting(false)
        if (r.ok) {
          setConnected(true)
        } else {
          setError(r.error ?? 'Auth failed')
        }
        off()
      })
    } catch (err) {
      setConnecting(false)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDisconnect() {
    await window.api.spotifyDisconnect()
    setConnected(false)
    setTrack(null)
  }

  const progress = track ? (track.progress_ms / track.duration_ms) * 100 : 0

  return (
    <div className="spotify-widget">
      <div className="spotify-label">
        <span>♪ Spotify</span>
        {connected && (
          <button className="spotify-disconnect" onClick={handleDisconnect} title="Disconnect">
            ×
          </button>
        )}
      </div>

      {!hasClientId && (
        <p className="spotify-hint">Add SPOTIFY_CLIENT_ID to .env.local</p>
      )}

      {hasClientId && !connected && (
        <button
          className="spotify-connect-btn"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? 'Opening browser…' : 'Connect'}
        </button>
      )}

      {error && <p className="spotify-hint" style={{ color: '#ff8090' }}>{error}</p>}

      {connected && !track && (
        <p className="spotify-hint">Nothing playing</p>
      )}

      {connected && track && (
        <>
          <div className="spotify-track">
            {track.album_art && (
              <img className="spotify-art" src={track.album_art} alt="" />
            )}
            <div className="spotify-info">
              <span className="spotify-name">{track.name}</span>
              <span className="spotify-artist">{track.artists}</span>
            </div>
          </div>

          <div className="spotify-progress-bar">
            <div className="spotify-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="spotify-time">
            <span>{fmt(track.progress_ms)}</span>
            <span>{fmt(track.duration_ms)}</span>
          </div>

          <div className="spotify-controls">
            <button onClick={() => window.api.spotifyPrev()} title="Previous">⏮</button>
            <button
              className="spotify-play-btn"
              onClick={() => track.is_playing ? window.api.spotifyPause() : window.api.spotifyPlay()}
              title={track.is_playing ? 'Pause' : 'Play'}
            >
              {track.is_playing ? '⏸' : '▶'}
            </button>
            <button onClick={() => window.api.spotifyNext()} title="Next">⏭</button>
          </div>
        </>
      )}
    </div>
  )
}
