import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PODS_ROOT = path.resolve(process.cwd(), '..', 'pods');

function readFolder(folder: string) {
  const dir = path.join(PODS_ROOT, folder);
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '.gitkeep');
    return files.map(f => {
      try {
        const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
        const data = JSON.parse(raw);
        return { name: f, task_id: data.task_id || f, title: data.title, status: data.status || folder, priority: data.priority, folder };
      } catch {
        return { name: f, task_id: f, status: folder, folder };
      }
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const pods = [
    ...readFolder('inbox'),
    ...readFolder('active'),
    ...readFolder('archive'),
    ...readFolder('failed'),
  ];
  return NextResponse.json({ pods });
}
