import { NextRequest, NextResponse } from 'next/server';
import { Client, PrivateKey, TopicMessageQuery } from '@hashgraph/sdk';
import 'dotenv/config';

// ---------- Helper: extract API key from request ----------
function getApiKeyFromRequest(req: NextRequest): string | null {
  // 1. Try Authorization header (Bearer token)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  // 2. Try x-api-key header
  const xApiKey = req.headers.get('x-api-key');
  if (xApiKey) return xApiKey;
  // 3. Not in headers – will try body later
  return null;
}

// ---------- Your existing mainnet client setup ----------
const operatorId = process.env.MAINNET_OPERATOR_ID!;
const operatorKey = PrivateKey.fromStringDer(process.env.MAINNET_OPERATOR_KEY!);
const topicId = process.env.MAINNET_TOPIC_ID!;

const client = Client.forMainnet();
client.setOperator(operatorId, operatorKey);

// ---------- Your existing verification logic (unchanged) ----------
async function verifyHashOnMainnet(hash: string): Promise<{
  exists: boolean;
  timestamp?: string;
  sequenceNumber?: number;
  certificateId?: string;
}> {
  const mirrorNodeUrl = 'https://mainnet.mirrornode.hedera.com';
  let nextLink: string | null = `/api/v1/topics/${topicId}/messages?order=desc&limit=100`;

  while (nextLink) {
    const url = `${mirrorNodeUrl}${nextLink}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    const messages = data.messages || [];
    for (const msg of messages) {
      try {
        const decoded = Buffer.from(msg.message, 'base64').toString();
        const parsed = JSON.parse(decoded);
        if (parsed.hash === hash) {
          const seq = parseInt(msg.sequence_number, 10);
          return {
            exists: true,
            timestamp: msg.consensus_timestamp,
            sequenceNumber: seq,
            certificateId: `${topicId}@${seq}`,
          };
        }
      } catch {
        // ignore non‑JSON messages
      }
    }
    nextLink = data.links?.next || null;
  }
  return { exists: false };
}

// ---------- POST handler ----------
export async function POST(req: NextRequest) {
  try {
    // 1. Extract API key (first from headers, then from body)
    let apiKey = getApiKeyFromRequest(req);
    let body: any = {};

    if (!apiKey) {
      // No key in headers, read body to get it
      body = await req.json();
      apiKey = body.apiKey;
    } else {
      // Already have key from headers, still need body for hash
      body = await req.json();
    }

    const { hash } = body;

    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid hash' }, { status: 400 });
    }

    const expectedKey = process.env.AGENT_API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    // 2. Perform verification
    const result = await verifyHashOnMainnet(hash);

    if (!result.exists) {
      return NextResponse.json({ valid: false, message: 'Hash not found on ledger' }, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      timestamp: result.timestamp,
      sequenceNumber: result.sequenceNumber,
      certificateId: result.certificateId,
    });
  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}