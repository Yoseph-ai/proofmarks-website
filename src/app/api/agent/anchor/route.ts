import { NextRequest, NextResponse } from 'next/server';
import { Client, PrivateKey, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import jwt from 'jsonwebtoken';
import { getAnchorRateLimiter } from '@/lib/rateLimit';   // <-- real rate limiter for anchor

// ---------- Helper: Extract API key ----------
function getApiKey(req: NextRequest): string | null {
  const xKey = req.headers.get('x-api-key');
  if (xKey) return xKey;
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

// ---------- Hedera client setup ----------
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

// ---------- POST handler ----------
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const apiKey = getApiKey(req);
    const expectedKey = process.env.AGENT_API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ---------- RATE LIMITING (stricter: 5 per minute) ----------
    let rateHeaders: Record<string, string> = {};
    const limiter = getAnchorRateLimiter();
    console.log('[Anchor RateLimit] Limiter present:', !!limiter);
    if (limiter) {
      const identifier = apiKey; // use API key as identifier
      const { success, limit, remaining, reset } = await limiter.limit(identifier);
      console.log('[Anchor RateLimit] Result:', { success, limit, remaining });
      rateHeaders = {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      };
      if (!success) {
        return NextResponse.json(
          { error: 'Too many anchor requests. Slow down.' },
          { status: 429, headers: rateHeaders }
        );
      }
    }
    // ---------- END RATE LIMITING ----------

    // 2. Parse request body
    const body = await req.json();
    const { hash } = body;
    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid hash' }, { status: 400 });
    }

    // 3. Submit to Hedera
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

    // 4. Generate JWT receipt
    const receiptPayload = {
      hash,
      sequenceNumber,
      consensusTimestamp,
      topicId,
      iat: Math.floor(Date.now() / 1000),
    };
    const receiptToken = jwt.sign(receiptPayload, process.env.JWT_SECRET!, { expiresIn: '1y' });

    // 5. Return success with rate limit headers
    return NextResponse.json(
      {
        success: true,
        sequenceNumber,
        consensusTimestamp,
        certificateId: `${topicId}@${sequenceNumber}`,
        receipt: receiptToken,
      },
      { status: 200, headers: rateHeaders }
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