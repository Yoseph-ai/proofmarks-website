import { NextRequest, NextResponse } from 'next/server';

const TOPIC_ID = '0.0.8626999';
const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';

async function verifyHashOnTestnet(hash: string) {
  let nextLink: string | null = `/api/v1/topics/${TOPIC_ID}/messages?order=desc&limit=100`;

  while (nextLink) {
    const url = `${MIRROR_NODE_URL}${nextLink}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    const messages = data.messages || [];

    for (const msg of messages) {
      try {
        const decoded = Buffer.from(msg.message, 'base64').toString('utf-8');
        let parsed;
        try {
          parsed = JSON.parse(decoded);
        } catch {
          parsed = { hash: decoded };
        }
        if (parsed.hash === hash) {
          return {
            exists: true,
            timestamp: msg.consensus_timestamp,
            sequenceNumber: parseInt(msg.sequence_number, 10),
            certificateId: `${TOPIC_ID}@${msg.sequence_number}`,
          };
        }
      } catch {
        // skip malformed messages
      }
    }
    nextLink = data.links?.next || null;
  }
  return { exists: false };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hash } = body;
    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid hash' }, { status: 400 });
    }

    const result = await verifyHashOnTestnet(hash);

    if (!result.exists) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      timestamp: result.timestamp,
      sequenceNumber: result.sequenceNumber,
      certificateId: result.certificateId,
      network: 'testnet',
      mirrorNodeUrl: MIRROR_NODE_URL,
    });
  } catch (error) {
    console.error('Direct verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}