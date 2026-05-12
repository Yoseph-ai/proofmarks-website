// src/lib/hederaService.js
import {
    Client,
    PrivateKey,
    AccountId,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
    AccountBalanceQuery
} from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * Custom error thrown when a duplicate hash is submitted.
 * Includes the original submission details so the client can display them.
 */
export class DuplicateHashError extends Error {
    constructor(message, timestamp, sequenceNumber) {
        super(message);
        this.name = 'DuplicateHashError';
        this.timestamp = timestamp;
        this.sequenceNumber = sequenceNumber;
    }
}

// Lazy initialization to avoid throwing at import/build time.
let accountId = null;
let privateKey = null;
let network = null;
let client = null;
let initialized = false;

// Topic ID – can be set later via environment after creation
let topicId = process.env.HEDERA_TOPIC_ID || null;

function ensureInitialized() {
    if (initialized) return;

    const requiredEnvVars = ['HEDERA_ACCOUNT_ID', 'HEDERA_PRIVATE_KEY', 'HEDERA_NETWORK'];
    for (const varName of requiredEnvVars) {
        if (!process.env[varName]) {
            console.warn(`Missing environment variable: ${varName} — Hedera functions will throw if used at runtime.`);
            // do not throw here; allow build to proceed.
            // initialization will be considered incomplete.
            initialized = false;
            return;
        }
    }

    // parse and initialize
    accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
    network = process.env.HEDERA_NETWORK;
    client = Client.forName(network).setOperator(accountId, privateKey);
    initialized = true;
}

// --- Core Functions ---

/**
 * Create a new HCS topic for document timestamps.
 */
export async function createTopic() {
    ensureInitialized();
    if (!initialized) throw new Error('Hedera environment not configured. Cannot create topic.');

    const transaction = await new TopicCreateTransaction()
        .setSubmitKey(privateKey.publicKey)
        .setTopicMemo("Document Authentication Service")
        .execute(client);

    const receipt = await transaction.getReceipt(client);
    const newTopicId = receipt.topicId;
    console.log(`✅ Topic created: ${newTopicId}`);
    return newTopicId.toString();
}

/**
 * Submit a SHA‑256 document hash to the HCS topic.
 * Scans the entire topic (oldest→newest) for an existing hash before submitting.
 * Throws if the hash already exists, including the original timestamp and sequence number.
 */
export async function submitHash(hashString) {
    ensureInitialized();
    if (!initialized) throw new Error('Hedera environment not configured.');
    if (!topicId) {
        throw new Error("Topic ID not set. Call setTopicId() or define HEDERA_TOPIC_ID in .env.");
    }

    // --- Duplicate check (full topic scan, oldest first) ---
const existing = await verifyHash(hashString);
if (existing.exists) {
    const rawTimestamp = existing.timestamp; // e.g., "1776678768.000180000"
    const [secondsStr, nanosStr = '0'] = rawTimestamp.split('.');
    const seconds = parseInt(secondsStr, 10);
    const date = new Date(seconds * 1000);
    // Remove the milliseconds part added by toISOString(), then append full nanoseconds
    const isoWithoutFraction = date.toISOString().replace(/\.\d+Z$/, 'Z'); // "2026-04-20T09:52:48Z"
    const fullTimestamp = isoWithoutFraction.replace('Z', `.${nanosStr.padStart(9, '0')}Z`);

    const msg = `Yoseph Says: Document already timestamped at ${fullTimestamp} (sequence #${existing.sequenceNumber}).`;
    throw new DuplicateHashError(msg, rawTimestamp, existing.sequenceNumber);
}
// --- End duplicate check ---

    const transaction = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(hashString)
        .execute(client);

    const receipt = await transaction.getReceipt(client);
    return {
        topicId: topicId,
        sequenceNumber: receipt.topicSequenceNumber.toString(),
        transactionId: transaction.transactionId.toString(),
        timestamp: receipt.consensusTimestamp?.toString() || new Date().toISOString()
    };
}

/**
 * Verify if a given hash exists ANYWHERE in the topic by scanning ALL messages
 * from the Mirror Node (oldest → newest). Returns the first (oldest) occurrence found.
 */
export async function verifyHash(hashString) {
    if (!topicId) {
        throw new Error("Topic ID not set.");
    }

    const mirrorNodeUrl = (process.env.HEDERA_NETWORK || network) === "mainnet"
        ? "https://mainnet.mirrornode.hedera.com"
        : "https://testnet.mirrornode.hedera.com";

    const baseUrl = `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages`;
    const pageSize = 100;
    // Start from the oldest message
    let nextUrl = `${baseUrl}?limit=${pageSize}&order=asc`;

    try {
        while (nextUrl) {
            const response = await fetch(nextUrl);
            if (!response.ok) {
                throw new Error(`Mirror Node returned status ${response.status}`);
            }
            const data = await response.json();

            for (const msg of data.messages) {
                const messageContent = Buffer.from(msg.message, 'base64').toString('utf8');
                if (messageContent === hashString) {
                    // First match is the oldest because we're scanning asc
                    return {
                        exists: true,
                        timestamp: msg.consensus_timestamp,
                        sequenceNumber: msg.sequence_number
                    };
                }
            }

            // Follow the next link if it exists (absolute path from Mirror Node response)
            nextUrl = data.links?.next ? `${mirrorNodeUrl}${data.links.next}` : null;
        }

        // Scanned everything, hash not found
        return { exists: false, timestamp: null, sequenceNumber: null };

    } catch (error) {
        console.error("Mirror Node query failed:", error);
        throw new Error("Verification service temporarily unavailable.");
    }
}

/**
 * Manually set the topic ID.
 */
export function setTopicId(id) {
    topicId = id;
}

/**
 * Get the current topic ID.
 */
export function getTopicId() {
    return topicId;
}

/**
 * Test the connection to Hedera.
 */
export async function testConnection() {
    ensureInitialized();
    if (!initialized) {
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
        console.error("Connection failed:", error);
        return false;
    }
}

// Auto‑initialize topicId from env if present
if (topicId) {
    console.log(`📌 Using HCS Topic: ${topicId}`);
}