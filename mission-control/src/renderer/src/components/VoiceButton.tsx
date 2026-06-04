import { useRef, useState } from 'react'

interface Props {
  onTranscript: (text: string, isFinal: boolean) => void
  disabled?: boolean
}

const SR = window.SpeechRecognition ?? (window as Record<string, unknown>).webkitSpeechRecognition

export default function VoiceButton({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<InstanceType<typeof SR> | null>(null)

  if (!SR) {
    return (
      <button className="voice-btn" disabled title="Speech recognition not available">
        🎙
      </button>
    )
  }

  function start() {
    const rec = new SR() as InstanceType<typeof SR>
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1]
      onTranscript(result[0].transcript, result.isFinal)
    }

    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)

    recRef.current = rec
    rec.start()
    setListening(true)
  }

  function stop() {
    recRef.current?.stop()
    setListening(false)
  }

  return (
    <button
      className={`voice-btn ${listening ? 'listening' : ''}`}
      onClick={listening ? stop : start}
      disabled={disabled}
      title={listening ? 'Stop listening' : 'Voice input'}
    >
      🎙
    </button>
  )
}
