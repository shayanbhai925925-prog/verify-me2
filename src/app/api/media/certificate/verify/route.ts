import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const cert = await req.json();

    if (!cert || !cert.proof || !cert.proof.signature) {
      return NextResponse.json(
        { valid: false, reason: 'Invalid certificate structure or missing signature' },
        { status: 400 }
      );
    }

    const { proof, ...payload } = cert;
    const secret = process.env.TOKEN_SIGNING_KEY || process.env.PROTECTMEDIA_SIGNING_SECRET;
    if (!secret) {
      return NextResponse.json(
        { valid: false, reason: 'Server configuration error: signing secret not set.' },
        { status: 500 }
      );
    }

    // Reconstruct the payload string that was signed
    const payloadString = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    // Use timingSafeEqual to avoid timing attacks
    const sigBufferA = Buffer.from(proof.signature, 'hex');
    const sigBufferB = Buffer.from(expectedSignature, 'hex');

    if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
      return NextResponse.json({
        valid: false,
        reason: 'Cryptographic signature mismatch. The certificate has been tampered with or was forged.',
      });
    }

    return NextResponse.json({
      valid: true,
      assetId: payload.asset?.id,
      fileName: payload.asset?.fileName,
      issuedAt: payload.issuedAt,
      registeredAt: payload.asset?.registeredAt,
      auditEventsCount: payload.auditChain?.length || 0,
      network: payload.network,
    });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Certificate verification failure:', err);
    } else {
      console.error('[API_ERROR]', { endpoint: '/api/media/certificate/verify', code: 'INTERNAL_ERROR' });
    }
    return NextResponse.json({ valid: false, reason: 'An unexpected error occurred.' }, { status: 500 });
  }
}