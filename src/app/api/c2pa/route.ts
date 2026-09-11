import { NextRequest, NextResponse } from 'next/server';
import { Reader } from '@contentauth/c2pa-node';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof Blob)) {
            return NextResponse.json(
                { error: 'No valid image file provided for C2PA verification.' },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const filename = (file as File).name || 'uploaded_image';
        let mimeType = file.type || '';

        // Infer MIME type if not provided or application/octet-stream
        if (!mimeType || mimeType === 'application/octet-stream') {
            const lower = filename.toLowerCase();
            if (lower.endsWith('.png')) mimeType = 'image/png';
            else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
            else if (lower.endsWith('.webp')) mimeType = 'image/webp';
            else if (lower.endsWith('.avif')) mimeType = 'image/avif';
            else if (lower.endsWith('.tif') || lower.endsWith('.tiff')) mimeType = 'image/tiff';
            else mimeType = 'image/jpeg';
        }

        try {
            const reader = await Reader.fromAsset({ buffer, mimeType });

            if (!reader) {
                return NextResponse.json({
                    status: 'NOT_FOUND',
                    has_credentials: false,
                    message: 'No embedded C2PA Content Credentials found in this media asset.',
                });
            }

            const manifestStore = reader.json();
            const activeManifest = reader.getActive();
            const activeLabel = reader.activeLabel();

            // Extract actions (e.g. c2pa.created, c2pa.edited, c2pa.ai_generated, etc.)
            const actionsAssertion = activeManifest?.assertions?.find(
                (a: any) => a.label === 'c2pa.actions' || a.label === 'c2pa.actions.v2'
            );
            const actions = (actionsAssertion?.data as any)?.actions || [];

            // Extract digital signature & issuer information
            const signatureInfo = activeManifest?.signature_info;

            // Check validation status from the manifest store
            const validationState = (manifestStore as any)?.validation_state; // 'Trusted' | 'Valid' | 'Invalid'
            const validationStatus = (manifestStore as any)?.validation_status || [];

            const isUntrusted = Array.isArray(validationStatus) && validationStatus.some(
                (v: any) => v.code === 'signingCredential.untrusted' || v.code?.includes('untrusted')
            );
            const isInvalid = validationState === 'Invalid' || (Array.isArray(validationStatus) && validationStatus.some(
                (v: any) => v.code?.includes('mismatch') || v.code?.includes('corrupt') || v.code?.includes('tampered') || v.status === 'failure'
            ));

            let status: 'VALID' | 'UNTRUSTED' | 'INVALID' | 'NOT_FOUND' = 'VALID';
            if (isInvalid) {
                status = 'INVALID';
            } else if (validationState === 'Trusted' && !isUntrusted) {
                status = 'VALID';
            } else if (isUntrusted || validationState === 'Valid') {
                status = 'UNTRUSTED';
            }

            return NextResponse.json({
                status,
                has_credentials: true,
                validation_state: validationState,
                active_label: activeLabel,
                manifest: {
                    title: activeManifest?.title || filename,
                    format: activeManifest?.format || mimeType,
                    claim_generator: activeManifest?.claim_generator || 'Unknown Generator',
                    claim_generator_info: activeManifest?.claim_generator_info_name || null,
                    issuer: signatureInfo?.issuer || 'Unknown Issuer',
                    time: signatureInfo?.time || activeManifest?.signature_info?.time || null,
                    actions: actions,
                    validation_status: validationStatus,
                },
                raw_manifest_store: manifestStore,
            });
        } catch (readerError: any) {
            console.warn('C2PA parsing notice:', readerError?.message || readerError);
            return NextResponse.json({
                status: 'NOT_FOUND',
                has_credentials: false,
                message: readerError?.message || 'No C2PA Content Credentials could be read from this file.',
            });
        }
    } catch (err: any) {
        console.error('Error in /api/c2pa route:', err);
        return NextResponse.json(
            { error: err.message || 'Internal server error during C2PA verification.' },
            { status: 500 }
        );
    }
}
