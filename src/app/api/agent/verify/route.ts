import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter } from '@/lib/rateLimit';   // <-- corrected

const HASH_REGEX = /^[a-f0-9]{64}$/i;

function getApiKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return req.headers.get('x-api-key');
}

function getTopicId(): string {
  const topicId = process.env.MAINNET_TOPIC_ID;
  if (!topicId) throw new Error('MAINNET_TOPIC_ID not configured.');
  return topicId;
}

async function verifyHashOnMainnet(hash: string): Promise<{
  exists: boolean;
  timestamp?: string;
  sequenceNumber?: number;
  certificateId?: string;
}> {
  const topicId = getTopicId();
  const mirrorNodeUrl = 'https://mainnet.mirrornode.hedera.com';
  let nextLink: string | null =
    `/api/v1/topics/${topicId}/messages?order=asc&limit=100`;

  while (nextLink) {
    const res = await fetch(`${mirrorNodeUrl}${nextLink}`);
    if (!res.ok) break;
    const data = await res.json();

    for (const msg of data.messages ?? []) {
      try {
        const decoded = Buffer.from(msg.message, 'base64').toString('utf8');
        const seq = parseInt(msg.sequence_number, 10);

        let isMatch = false;
        try {
          const parsed = JSON.parse(decoded);
          isMatch = parsed.hash === hash;
        } catch {
          isMatch = decoded === hash;
        }

        if (isMatch) {
          return {
            exists:         true,
            timestamp:      msg.consensus_timestamp,
            sequenceNumber: seq,
            certificateId:  `${topicId}@${seq}`,
          };
        }
      } catch {
        // skip malformed messages
      }
    }

    nextLink = data.links?.next ?? null;
  }

  return { exists: false };
}

export async function POST(req: NextRequest) {
  try {
    let apiKey = getApiKey(req);
    const body: { hash?: string; apiKey?: string } = await req.json();
    if (!apiKey) apiKey = body.apiKey ?? null;

    const { hash } = body;

    if (!hash || typeof hash !== 'string' || !HASH_REGEX.test(hash)) {
      return NextResponse.json(
        { error: 'Missing or invalid hash' },
        { status: 400 }
      );
    }

    const expectedKey = process.env.AGENT_API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    let rateHeaders: Record<string, string> = {};
    const limiter = getRateLimiter();
    console.log('[RateLimit] Limiter present:', !!limiter);

    if (limiter) {
      const { success, limit, remaining, reset } = await limiter.limit(apiKey);
      console.log('[RateLimit] Result:', { success, limit, remaining });

      rateHeaders = {
        'X-RateLimit-Limit':     limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset':     new Date(reset).toISOString(),
      };

      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429, headers: rateHeaders }
        );
      }
    }

    const result = await verifyHashOnMainnet(hash);

    if (!result.exists) {
      return NextResponse.json(
        { valid: false, message: 'Hash not found on ledger' },
        { status: 200, headers: rateHeaders }
      );
    }

    return NextResponse.json(
      {
        valid:          true,
        timestamp:      result.timestamp,
        sequenceNumber: result.sequenceNumber,
        certificateId:  result.certificateId,
      },
      { status: 200, headers: rateHeaders }
    );
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}