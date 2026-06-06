// src/app/api/verify/route.js
import { verifyHash } from '@/lib/hederaService';

export async function POST(request) {
    try {
        const { hash } = await request.json();

        if (!hash || typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
            return Response.json({ error: 'Invalid SHA-256 hash provided' }, { status: 400 });
        }

        const result = await verifyHash(hash);
        return Response.json(result);
    } catch (error) {
        console.error('Verify API error:', error);
        return Response.json({ error: 'Verification service unavailable' }, { status: 503 });
    }
}