import { NextRequest, NextResponse } from 'next/server';
import { Client, PrivateKey, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import jwt from 'jsonwebtoken';
import { getRateLimiter } from '../../../../lib/rateLimit';

function getApiKey(req: NextRequest): string | null {
  const xKey = req.headers.get('x-api-key');
  if (xKey) return xKey;
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

function getHederaClient(): { client: Client; topicId: string } {
  const operatorId = process.env.MAINNET_OPERATOR_ID;
  const operatorKey = process.env.MAINNET_OPERATOR_KEY;
  const topicId = process.env.MAINNET_TOPIC_ID;

  if (!operatorId || !operatorKey || !topicId) {
    throw new Error('Hedera environment not configured.');
  }

  const client = Client.forMainnet();
  client.setOperator(operatorId, PrivateKey.fromStringDer(operatorKey));
  return { client, topicId };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey(req);
    const expectedKey = process.env.AGENT_API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rateHeaders: Record<string, string> = {};
    const limiter = getRateLimiter();
    if (limiter) {
      const { success, limit, reset, remaining } = await limiter.limit(apiKey);
      rateHeaders = {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      };
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429, headers: rateHeaders }
        );
      }
    }

    const body = await req.json();
    const { hash } = body;
    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid hash' }, { status: 400 });
    }

    const { client, topicId } = getHederaClient();

    const message = JSON.stringify({ hash, source: 'mcp' });
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .execute(client);

    const receipt = await tx.getReceipt(client);
    const record = await tx.getRecord(client);
    const sequenceNumber = Number(receipt.topicSequenceNumber);
    const consensusTimestamp = record.consensusTimestamp?.toString();

    const receiptPayload = {
      hash,
      sequenceNumber,
      consensusTimestamp,
      topicId,
      iat: Math.floor(Date.now() / 1000),
    };
    const receiptToken = jwt.sign(receiptPayload, process.env.JWT_SECRET!, { expiresIn: '1y' });

    return NextResponse.json(
      {
        success: true,
        sequenceNumber,
        consensusTimestamp,
        certificateId: `${topicId}@${sequenceNumber}`,
        receipt: receiptToken,
      },
      { headers: rateHeaders }
    );
  } catch (err: unknown) {
    console.error('Anchor error:', err);
    const message = err instanceof Error ? err.message : '';
    const safeMsg = message.includes('INSUFFICIENT_PAYER')
      ? 'Insufficient HBAR – top up operator account'
      : 'Internal server error';
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}