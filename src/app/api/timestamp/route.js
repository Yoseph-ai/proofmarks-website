// src/app/api/timestamp/route.js
import { submitHash } from '../../../lib/hederaService.js';

export async function POST(request) {
    try {
        const { hash } = await request.json();

        if (!hash || typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
            return Response.json({ error: 'Invalid SHA-256 hash provided' }, { status: 400 });
        }

        const result = await submitHash(hash);
        return Response.json(result);
    } catch (error) {
        console.error('Timestamp API error:', error);
        return Response.json({ error: 'Timestamping service unavailable' }, { status: 503 });
    }
}