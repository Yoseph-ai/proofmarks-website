import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hash } = body;
    if (!hash) {
      return NextResponse.json({ error: 'Missing hash' }, { status: 400 });
    }

    // Call the internal agent verify endpoint
    const agentUrl = new URL('/api/agent/verify', req.url).toString();
    const apiKey = process.env.AGENT_API_KEY;
    if (!apiKey) {
      console.error('AGENT_API_KEY not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ hash }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Verification failed' }, { status: response.status });
    }

    // Transform the response to match the frontend's expected shape
    if (data.valid) {
      return NextResponse.json({
        exists: true,
        timestamp: data.timestamp,
        sequenceNumber: data.sequenceNumber,
        certificateId: data.certificateId,
        network: 'testnet',            // hardcoded for now, could be dynamic
        mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
        transactionId: data.transactionId || undefined,
      });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error('Proxy verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}