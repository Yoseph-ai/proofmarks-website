import { NextRequest, NextResponse } from 'next/server';
import { Client, PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

const operatorId = process.env.MAINNET_OPERATOR_ID!;
const operatorKey = PrivateKey.fromStringDer(process.env.MAINNET_OPERATOR_KEY!);
const topicId = process.env.MAINNET_TOPIC_ID!;

const client = Client.forMainnet();
client.setOperator(operatorId, operatorKey);

const VALID_API_KEYS = new Set([process.env.AGENT_API_KEY || 'dev-key-123']);

async function verifyHashOnMainnet(hash: string): Promise<{ exists: boolean; timestamp?: string; sequenceNumber?: number }> {
  const mirrorNodeUrl = "https://mainnet.mirrornode.hedera.com";
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
          return {
            exists: true,
            timestamp: msg.consensus_timestamp,
            sequenceNumber: parseInt(msg.sequence_number, 10),
          };
        }
      } catch (e) { /* ignore non‑JSON messages */ }
    }
    nextLink = data.links?.next || null;
  }
  return { exists: false };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hash, apiKey } = body;

    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid hash' }, { status: 400 });
    }
    if (!apiKey || !VALID_API_KEYS.has(apiKey)) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const result = await verifyHashOnMainnet(hash);

    if (!result.exists) {
      return NextResponse.json({ valid: false, message: 'Hash not found on ledger' }, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      timestamp: result.timestamp,
      sequenceNumber: result.sequenceNumber,
      certificateId: `${topicId}@${result.sequenceNumber}`,
    });
  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}