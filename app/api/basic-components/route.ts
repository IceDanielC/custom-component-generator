import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'ai-docs', 'basic-components.txt');
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading basic components file:', error);
    return NextResponse.json({ error: 'Failed to load component documentation' }, { status: 500 });
  }
}
