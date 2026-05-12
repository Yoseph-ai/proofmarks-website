// src/app/api/certificate/[certificateId]/route.js
export async function GET(request, { params }) {
    const { certificateId } = params; // e.g. "0.0.8626999@6"

    try {
        // Parse certificateId
        const atIndex = certificateId.lastIndexOf("@");
        if (atIndex === -1) {
            return Response.json({ error: "Invalid certificate ID format" }, { status: 400 });
        }
        const topicId = certificateId.substring(0, atIndex);
        const sequenceNumber = certificateId.substring(atIndex + 1);

        // Determine Mirror Node URL from env (same logic as hederaService)
        const network = process.env.HEDERA_NETWORK || "testnet";
        const mirrorNodeUrl = network === "mainnet"
            ? "https://mainnet.mirrornode.hedera.com"
            : "https://testnet.mirrornode.hedera.com";

        // Fetch the specific message
        const res = await fetch(
            `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages/${sequenceNumber}`
        );
        if (!res.ok) {
            return Response.json(
                { error: `Mirror Node returned ${res.status}` },
                { status: 502 }
            );
        }
        const msg = await res.json();
        // Extract hash from message payload (base64)
        const hash = Buffer.from(msg.message, "base64").toString("utf8");

        return Response.json({
            certificateId,
            topicId,
            sequenceNumber: msg.sequence_number,
            timestamp: msg.consensus_timestamp,
            hash,
            network,
            mirrorNodeUrl,
            hashAlgorithm: "SHA-256",
            // ISO timestamp formatting for display
            timestampIso: formatTimestamp(msg.consensus_timestamp),
            logoUrl: process.env.LOGO_URL || null,
        });
    } catch (error) {
        console.error("Certificate fetch error:", error);
        return Response.json(
            { error: "Unable to load certificate" },
            { status: 500 }
        );
    }
}

// Helper to convert raw timestamp to ISO with nanos (same as client-side)
function formatTimestamp(raw) {
    if (!raw) return null;
    const [sec, nano = "0"] = raw.split(".");
    const date = new Date(parseInt(sec, 10) * 1000);
    const iso = date.toISOString().replace(/\.\d+Z$/, "Z");
    return iso.replace("Z", `.${nano.padStart(9, "0")}Z`);
}