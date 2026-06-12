import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      // Try streaming via claude CLI
      let claudeAvailable = true;
      const proc = spawn('claude', ['-p', prompt, '--output-format', 'stream-json'], {
        env: { ...process.env },
      });

      let hasOutput = false;

      proc.stdout.on('data', (chunk: Buffer) => {
        hasOutput = true;
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            // stream-json emits {type, delta, ...}
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              enqueue({ type: 'delta', text: parsed.delta.text });
            } else if (parsed.type === 'message_stop') {
              enqueue({ type: 'done' });
            } else if (parsed.result) {
              // flat JSON result fallback
              enqueue({ type: 'delta', text: parsed.result });
              enqueue({ type: 'done' });
            }
          } catch {
            // Plain text fallback
            enqueue({ type: 'delta', text: line });
          }
        }
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        if (text.includes('command not found') || text.includes('ENOENT')) {
          claudeAvailable = false;
        }
        enqueue({ type: 'error', text });
      });

      proc.on('close', () => {
        if (!hasOutput && !claudeAvailable) {
          enqueue({ type: 'delta', text: '[Claude CLI not found. Set ANTHROPIC_API_KEY and install claude.]' });
        }
        enqueue({ type: 'done' });
        controller.close();
      });

      proc.on('error', () => {
        enqueue({ type: 'delta', text: '[Claude CLI not available in this environment. Install with: npm i -g @anthropic-ai/claude-code]' });
        enqueue({ type: 'done' });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
