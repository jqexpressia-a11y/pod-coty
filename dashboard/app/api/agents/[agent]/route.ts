import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

async function runOpenClaw(message: string): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn('openclaw', ['agent', '--agent', 'jq-pm', '--message', message], {
      env: { ...process.env },
    });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    proc.on('close', () => resolve(out || err || '[No response from OpenClaw]'));
    proc.on('error', () => resolve('[OpenClaw CLI not available. Install via: curl -fsSL https://openclaw.ai/install.sh | bash]'));
  });
}

async function runHermes(message: string): Promise<string> {
  const webhookUrl = process.env.HERMES_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_message: message }),
      });
      const data = await res.json();
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return `[Hermes webhook error: ${e}]`;
    }
  }
  return '[Hermes not configured. Set HERMES_WEBHOOK_URL in .env.local]';
}

export async function POST(req: NextRequest, { params }: { params: { agent: string } }) {
  const { message } = await req.json();
  const agentId = params.agent;

  let response = '';
  if (agentId === 'openclaw') response = await runOpenClaw(message);
  else if (agentId === 'hermes') response = await runHermes(message);
  else response = `[Unknown agent: ${agentId}]`;

  return NextResponse.json({ response, agent: agentId, timestamp: new Date().toISOString() });
}

export async function GET(_req: NextRequest, { params }: { params: { agent: string } }) {
  const statusMap: Record<string, object> = {
    openclaw: { name: 'OpenClaw PM', status: 'unknown', description: 'JQ Traffic Control Project Manager' },
    hermes:   { name: 'Hermes PM',   status: 'unknown', description: 'Automation Project Manager via n8n' },
  };
  return NextResponse.json(statusMap[params.agent] ?? { status: 'unknown' });
}
