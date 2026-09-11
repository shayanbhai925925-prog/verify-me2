import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyService';
import { supabase } from '@/lib/supabaseClient';
import {
  parseStoredPolicy,
  GranularPolicyState,
  PermissionOperation,
  OPERATION_LABELS,
} from '@/lib/permissionTypes';

export const dynamic = 'force-dynamic';

async function handleCheck(mediaId: string | null, operation: string | null, req: Request) {
  // 1. Validate API Key
  const authResult = await validateApiKey(req);
  if (!authResult.valid) {
    return NextResponse.json(
      { error: authResult.error, code: 'UNAUTHORIZED' },
      { status: authResult.statusCode || 401 }
    );
  }

  if (!mediaId) {
    return NextResponse.json(
      { error: "Query parameter or body field 'mediaId' is required." },
      { status: 400 }
    );
  }

  if (!operation) {
    return NextResponse.json(
      { error: "Query parameter or body field 'operation' is required." },
      { status: 400 }
    );
  }

  const validOperations: PermissionOperation[] = [
    'ai_editing',
    'face_swapping',
    'image_to_video',
    'style_transfer',
    'commercial_use',
    'redistribution',
    'ai_training',
  ];

  if (!validOperations.includes(operation as PermissionOperation)) {
    return NextResponse.json(
      {
        error: `Invalid operation '${operation}'. Valid operations: [${validOperations.join(', ')}]`,
      },
      { status: 400 }
    );
  }

  const typedOp = operation as PermissionOperation;

  // 2. Fetch media asset and associated policies
  const { data: media, error: mediaErr } = await supabase
    .from('media')
    .select(`
      id,
      file_name,
      user_id,
      media_policies (
        id,
        allow_ai_training,
        allow_ai_editing,
        allow_face_swap,
        allow_commercial,
        updated_at
      )
    `)
    .eq('id', mediaId)
    .maybeSingle();

  if (mediaErr || !media) {
    return NextResponse.json(
      { error: `Media asset not found for ID: ${mediaId}` },
      { status: 404 }
    );
  }

  const policyRecord = media.media_policies?.[0] || null;
  const policy: GranularPolicyState = parseStoredPolicy(policyRecord);
  const action = policy[typedOp] || 'require_approval';

  let status: 'ALLOWED' | 'DENIED' | 'REQUIRES_PERMISSION';
  let message: string;

  const opLabel = OPERATION_LABELS[typedOp]?.label || operation;

  if (action === 'allow') {
    status = 'ALLOWED';
    message = `Operation '${opLabel}' is globally permitted for this media asset by the creator.`;
  } else if (action === 'deny') {
    status = 'DENIED';
    message = `Operation '${opLabel}' is explicitly prohibited by the creator.`;
  } else {
    status = 'REQUIRES_PERMISSION';
    message = `Operation '${opLabel}' requires creator approval. Submit a request via POST /api/v1/permissions/request.`;
  }

  return NextResponse.json({
    mediaId: media.id,
    fileName: media.file_name,
    creatorId: media.user_id,
    operation: typedOp,
    status,
    policyAction: action,
    requiresManualRequest: status === 'REQUIRES_PERMISSION',
    message,
    availablePolicies: policy,
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mediaId = url.searchParams.get('mediaId');
    const operation = url.searchParams.get('operation');
    return await handleCheck(mediaId, operation, req);
  } catch (err: any) {
    console.error('Permission check GET error:', err);
    return NextResponse.json({ error: 'Internal server error checking permissions.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mediaId = body.mediaId;
    const operation = body.operation;
    return await handleCheck(mediaId, operation, req);
  } catch (err: any) {
    console.error('Permission check POST error:', err);
    return NextResponse.json({ error: 'Internal server error checking permissions.' }, { status: 500 });
  }
}
