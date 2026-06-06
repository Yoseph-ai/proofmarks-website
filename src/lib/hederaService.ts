import {
  Client,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  AccountBalanceQuery,
} from '@hashgraph/sdk';

// ─── Types ───────────────────────────────────────────────────────────────────

export class DuplicateHashError extends Error {
  timestamp: string;
  sequenceNumber: number;

  constructor(message: string, timestamp: string, sequenceNumber: number) {
    super(message);
    this.name = 'DuplicateHashError';
    this.timestamp = timestamp;
    this.sequenceNumber = sequenceNumber;
  }
}

interface VerifyResult {
  exists: boolean;
  timestamp: string | null;
  sequenceNumber: number | null;
  network?: string;
  mirrorNodeUrl?: string;
  certificateId?: string;
}

interface SubmitResult {
  topicId: string;
  sequenceNumber: string;
  transactionId: string;
  timestamp: string;
  network: string;
  mirrorNodeUrl: string;
  hashAlgorithm: string;
  submittedBy: string;
  timestampIso: string;
  logoUrl: string | null;
  certificateId: string;
}

// ─── Lazy Initialization State ───────────────────────────────────────────────

let accountId: AccountId | null = null;
let privateKey: PrivateKey | null = null;
let network: string | null = null;
let client: Client | null = null;
let initialized = false;
let topicId: string | null = process.env.HEDERA_TOPIC_ID ?? null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMirrorNodeUrl(): string {
  const net = network ?? process.env.HEDERA_NETWORK ?? 'testnet';
  return net === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
}

function buildTimestampIso(consensusTimestamp: {
  seconds: number | { toNumber(): number };
  nanos: number | { toNumber(): number };
}): string {
  const secondsNum = typeof consensusTimestamp.seconds === 'object'
    ? consensusTimestamp.seconds.toNumber()
    : consensusTimestamp.seconds;
  const nanosNum = typeof consensusTimestamp.nanos === 'object'
    ? consensusTimestamp.nanos.toNumber()
    : consensusTimestamp.nanos;
  const millis = secondsNum * 1000 + Math.floor(nanosNum / 1_000_000);
  const isoBase = new Date(millis).toISOString().replace(/\.\d+Z$/, 'Z');
  return isoBase.replace('Z', `.${String(nanosNum).padStart(9, '0')}Z`);
}

function ensureInitialized(): void {
  if (initialized) return;

  const required = ['HEDERA_ACCOUNT_ID', 'HEDERA_PRIVATE_KEY', 'HEDERA_NETWORK'] as const;
  for (const varName of required) {
    if (!process.env[varName]) {
      console.warn(
        `Missing environment variable: ${varName} — Hedera functions will throw if used at runtime.`
      );
      return;
    }
  }

  accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
  privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY!);
  network   = process.env.HEDERA_NETWORK!;
  client    = Client.forName(network).setOperator(accountId, privateKey);
  initialized = true;
}

// ─── Exported Functions ───────────────────────────────────────────────────────

export async function createTopic(): Promise<string> {
  ensureInitialized();
  if (!initialized || !client || !privateKey) {
    throw new Error('Hedera environment not configured. Cannot create topic.');
  }

  const transaction = await new TopicCreateTransaction()
    .setSubmitKey(privateKey.publicKey)
    .setTopicMemo('Document Authentication Service')
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  console.log(`✅ Topic created: ${receipt.topicId}`);
  return receipt.topicId!.toString();
}

export async function submitHash(hashString: string): Promise<SubmitResult> {
  ensureInitialized();
  if (!initialized || !client || !accountId) {
    throw new Error('Hedera environment not configured.');
  }
  if (!topicId) {
    throw new Error('Topic ID not set. Define HEDERA_TOPIC_ID in your environment variables.');
  }

  const existing = await verifyHash(hashString);
  if (existing.exists && existing.timestamp !== null && existing.sequenceNumber !== null) {
    const [secondsStr, nanosStr = '0'] = existing.timestamp.split('.');
    const isoBase = new Date(parseInt(secondsStr, 10) * 1000)
      .toISOString()
      .replace(/\.\d+Z$/, 'Z');
    const fullTimestamp = isoBase.replace('Z', `.${nanosStr.padStart(9, '0')}Z`);
    throw new DuplicateHashError(
      `Document already timestamped at ${fullTimestamp} (sequence #${existing.sequenceNumber}).`,
      existing.timestamp,
      existing.sequenceNumber
    );
  }

  const transaction = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(hashString)
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  const record  = await transaction.getRecord(client);

  const rawTimestamp  = record.consensusTimestamp?.toString() ?? new Date().toISOString();
  const timestampIso  = record.consensusTimestamp
    ? buildTimestampIso(record.consensusTimestamp)
    : rawTimestamp;
    
  const mirrorNodeUrl = getMirrorNodeUrl();

  return {
    topicId,
    sequenceNumber:  receipt.topicSequenceNumber!.toString(),
    transactionId:   transaction.transactionId!.toString(),
    timestamp:       rawTimestamp,
    network:         network ?? process.env.HEDERA_NETWORK ?? 'testnet',
    mirrorNodeUrl,
    hashAlgorithm:  'SHA-256',
    submittedBy:     accountId.toString(),
    timestampIso,
    logoUrl:         process.env.LOGO_URL ?? null,
    certificateId:  `${topicId}@${receipt.topicSequenceNumber}`,
  };
}

export async function verifyHash(hashString: string): Promise<VerifyResult> {
  if (!topicId) throw new Error('Topic ID not set.');

  const mirrorNodeUrl = getMirrorNodeUrl();
  let nextUrl: string | null =
    `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=100&order=asc`;

  try {
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error(`Mirror Node returned status ${response.status}`);
      }
      const data = await response.json();

      for (const msg of data.messages) {
        const content = Buffer.from(msg.message, 'base64').toString('utf8');
        if (content === hashString) {
          return {
            exists:         true,
            timestamp:      msg.consensus_timestamp,
            sequenceNumber: msg.sequence_number,
            network:        network ?? process.env.HEDERA_NETWORK ?? 'testnet',
            mirrorNodeUrl,
            certificateId:  `${topicId}@${msg.sequence_number}`,
          };
        }
      }

      nextUrl = data.links?.next ? `${mirrorNodeUrl}${data.links.next}` : null;
    }

    return { exists: false, timestamp: null, sequenceNumber: null };
  } catch (error) {
    console.error('Mirror Node query failed:', error);
    throw new Error('Verification service temporarily unavailable.');
  }
}

export function setTopicId(id: string): void { topicId = id; }
export function getTopicId(): string | null   { return topicId; }

export async function testConnection(): Promise<boolean> {
  ensureInitialized();
  if (!initialized || !client || !accountId) {
    console.error('Hedera environment not configured.');
    return false;
  }

  try {
    const balance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);
    console.log(`✅ Connected to ${network}. Balance: ${balance.hbars.toString()}`);
    return true;
  } catch (error) {
    console.error('Connection failed:', error);
    return false;
  }
}

if (topicId) console.log(`📌 Using HCS Topic: ${topicId}`);