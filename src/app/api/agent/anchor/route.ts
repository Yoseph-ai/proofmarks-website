import { NextRequest, NextResponse } from 'next/server';
import { Client, PrivateKey, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import 'dotenv/config';

const operatorId = process.env.MAINNET_OPERATOR_ID!;
const operatorKey = PrivateKey.fromStringDer(process.env.MAINNET_OPERATOR_KEY!);
const topicId = process.env.MAINNET_TOPIC_ID!;
const client = Client.forMainnet();
client.setOperator(operatorId, operatorKey);

function getApiKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return req.headers.get('x-api-key');
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey(req);
    const expectedKey = process.env.AGENT_API_KEY;
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { hash } = body;
    if (!hash || typeof hash !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid hash' }, { status: 400 });
    }

    const message = JSON.stringify({ hash, source: 'mcp' });
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .execute(client);

    const receipt = await tx.getReceipt(client);
    const sequenceNumber = receipt.topicSequenceNumber;

    // Fetch the record to get consensusTimestamp
    const record = await tx.getRecord(client);
    const consensusTimestamp = record.consensusTimestamp?.toString();

    return NextResponse.json({
      success: true,
      sequenceNumber,
      consensusTimestamp,
      certificateId: `${topicId}@${sequenceNumber}`,
    });
  } catch (err: any) {
    console.error('Anchor error:', err);
    const safeMsg = err.message?.includes('INSUFFICIENT_PAYER') ? 'Insufficient HBAR' : 'Internal error';
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}