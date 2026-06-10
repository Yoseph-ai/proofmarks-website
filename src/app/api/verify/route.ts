import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hash } = body;
    if (!hash) {
      return NextResponse.json({ error: 'Missing hash' }, { status: 400 });
    }

    const apiKey = process.env.AGENT_API_KEY;
    if (!apiKey) {
      console.error('[proxy] AGENT_API_KEY not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Build absolute URL to agent endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const agentUrl = `${baseUrl}/api/agent/verify`;

    console.log('[proxy] Calling agent:', agentUrl);

    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ hash }),
    });

    const data = await response.json();
    console.log('[proxy] Agent response status:', response.status, 'data:', data);

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Verification failed' }, { status: response.status });
    }

    if (data.valid) {
      return NextResponse.json({
        exists: true,
        timestamp: data.timestamp,
        sequenceNumber: data.sequenceNumber,
        certificateId: data.certificateId,
        network: 'testnet',
        mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
        transactionId: data.transactionId || undefined,
      });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error: any) {
    console.error('[proxy] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}