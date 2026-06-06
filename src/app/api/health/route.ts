import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    await kv.ping();
    return NextResponse.json({
      status: 'healthy',
      redis: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', redis: 'disconnected', error: String(error) },
      { status: 500 }
    );
  }
}