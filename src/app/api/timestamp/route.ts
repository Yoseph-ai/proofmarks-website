import { NextRequest, NextResponse } from 'next/server';
import { submitHash, DuplicateHashError } from '../../../lib/hederaService';

const HASH_REGEX = /^[a-f0-9]{64}$/i;

export async function POST(req: NextRequest) {
  try {
    const { hash } = await req.json();

    if (!hash || typeof hash !== 'string' || !HASH_REGEX.test(hash)) {
      return NextResponse.json(
        { error: 'Invalid SHA-256 hash provided' },
        { status: 400 }
      );
    }

    const result = await submitHash(hash);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Timestamp API error:', error);

    if (error instanceof DuplicateHashError) {
      return NextResponse.json(
        {
          error: error.message,
          originalTimestamp: error.timestamp,
          originalSequence: error.sequenceNumber,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Timestamping service unavailable' },
      { status: 503 }
    );
  }
}