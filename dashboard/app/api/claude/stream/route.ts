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

      let closed = false;
      const close = () => {
        if (!closed) { closed = true; controller.close(); }
      };

      // claude -p with stream-json requires --verbose
      const proc = spawn(
        'claude',
        ['-p', prompt, '--output-format', 'stream-json', '--verbose'],
        {
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe'], // close stdin immediately
        }
      );

      let hasContent = false;

      proc.stdout.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const ev = JSON.parse(line);
            // Anthropic stream-json event shapes
            if (ev.type === 'content_block_delta' && ev.delta?.text) {
              hasContent = true;
              enqueue({ type: 'delta', text: ev.delta.text });
            } else if (ev.type === 'message_stop') {
              enqueue({ type: 'done' });
            } else if (typeof ev.result === 'string') {
              // plain -p JSON result fallback
              hasContent = true;
              enqueue({ type: 'delta', text: ev.result });
              enqueue({ type: 'done' });
            }
          } catch {
            // non-JSON line — treat as raw text delta
            if (line.trim()) {
              hasContent = true;
              enqueue({ type: 'delta', text: line });
            }
          }
        }
      });

      const stderrLines: string[] = [];
      proc.stderr.on('data', (chunk: Buffer) => {
        stderrLines.push(chunk.toString());
      });

      proc.on('close', (code) => {
        if (!hasContent) {
          const errText = stderrLines.join('').trim();
          if (errText) {
            enqueue({ type: 'delta', text: `[Claude CLI error: ${errText}]` });
          } else {
            enqueue({ type: 'delta', text: '[No response — set ANTHROPIC_API_KEY in your environment]' });
          }
        }
        enqueue({ type: 'done' });
        close();
      });

      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          enqueue({ type: 'delta', text: '[Claude CLI not found — install: npm i -g @anthropic-ai/claude-code]' });
        } else {
          enqueue({ type: 'delta', text: `[Spawn error: ${err.message}]` });
        }
        enqueue({ type: 'done' });
        close();
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
