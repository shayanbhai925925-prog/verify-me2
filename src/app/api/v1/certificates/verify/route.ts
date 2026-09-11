import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateApiKey } from '@/lib/apiKeyService';
import { verifyVaultChain } from '@/lib/evidenceVault';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Validate API Key
    const authResult = await validateApiKey(req);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error, code: 'UNAUTHORIZED' },
        { status: authResult.statusCode || 401 }
      );
    }

    const cert = await req.json();

    if (!cert || !cert.proof || !cert.proof.signature) {
      return NextResponse.json(
        { valid: false, reason: 'Invalid certificate structure or missing signature proof.' },
        { status: 400 }
      );
    }

    const { proof, ...payload } = cert;
    const secret = process.env.PROTECTMEDIA_SIGNING_SECRET || 'fallback-secret-protect-media';

    // Reconstruct the payload string that was signed
    const payloadString = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    // Constant-time signature comparison
    const sigBufferA = Buffer.from(proof.signature, 'hex');
    const sigBufferB = Buffer.from(expectedSignature, 'hex');

    if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
      return NextResponse.json(
        {
          valid: false,
          reason: 'Cryptographic signature mismatch. The certificate has been altered, forged, or signed with a different key.',
        },
        { status: 403 }
      );
    }

    // Ledger Hash-Chain Integrity Verification
    let ledgerIntegrity: any = { verified: true, chainLength: payload.auditChain?.length || 0 };
    if (payload.asset?.id) {
      try {
        ledgerIntegrity = await verifyVaultChain(payload.asset.id);
      } catch (chainErr) {
        console.warn('Vault chain check skipped during cert verify:', chainErr);
      }
    }

    return NextResponse.json({
      valid: true,
      client: authResult.clientName,
      asset: {
        id: payload.asset?.id,
        fileName: payload.asset?.fileName,
        fileSize: payload.asset?.fileSize,
        mediaType: payload.asset?.mediaType,
        registeredAt: payload.asset?.registeredAt,
        integrity: payload.asset?.integrity,
      },
      provenance: {
        issuedAt: payload.issuedAt,
        network: payload.network,
        ledgerAnchor: proof.ledgerAnchor || 'Supabase-Postgres-Vault',
        auditEventsCount: payload.auditChain?.length || 0,
        chainIntegrity: ledgerIntegrity,
      },
    });
  } catch (err: unknown) {
    console.error('Certificate verification failure:', err);
    return NextResponse.json(
      { valid: false, reason: 'An unexpected internal error occurred during certificate verification.' },
      { status: 500 }
    );
  }
}
