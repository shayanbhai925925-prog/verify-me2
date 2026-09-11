/**
 * Permission Types & Constants for the VerifyMe Media Permission Network
 */

export type PermissionOperation =
    | 'ai_editing'
    | 'face_swapping'
    | 'image_to_video'
    | 'style_transfer'
    | 'commercial_use'
    | 'redistribution'
    | 'ai_training';

export type PolicyAction = 'allow' | 'require_approval' | 'deny';

export interface GranularPolicyState {
    ai_editing: PolicyAction;
    face_swapping: PolicyAction;
    image_to_video: PolicyAction;
    style_transfer: PolicyAction;
    commercial_use: PolicyAction;
    redistribution: PolicyAction;
    ai_training: PolicyAction;
}

export const DEFAULT_POLICY: GranularPolicyState = {
    ai_editing: 'require_approval',
    face_swapping: 'deny',
    image_to_video: 'require_approval',
    style_transfer: 'require_approval',
    commercial_use: 'deny',
    redistribution: 'require_approval',
    ai_training: 'deny',
};

export const OPERATION_LABELS: Record<PermissionOperation, { label: string; icon: string; description: string }> = {
    ai_editing: {
        label: 'AI Editing & Inpainting',
        icon: '🎨',
        description: 'Modification, generative fill, or alteration via AI models',
    },
    face_swapping: {
        label: 'Face Swapping & Identity Morphing',
        icon: '👤',
        description: 'Extracting or swapping facial features in synthetic media',
    },
    image_to_video: {
        label: 'Image-to-Video Synthesis',
        icon: '🎬',
        description: 'Animating, camera-panning, or synthesizing video from this image',
    },
    style_transfer: {
        label: 'Style Transfer & Remixing',
        icon: '✨',
        description: 'Extracting artistic aesthetic or derivative LoRA training',
    },
    commercial_use: {
        label: 'Commercial Monetization',
        icon: '💼',
        description: 'Use in paid advertising, products, or commercial services',
    },
    redistribution: {
        label: 'Redistribution & Syndication',
        icon: '📢',
        description: 'Reposting, sharing, or re-broadcasting on third-party platforms',
    },
    ai_training: {
        label: 'AI Model Training Datasets',
        icon: '🧠',
        description: 'Scraping and ingestion into foundation model training corpora',
    },
};

export type PermissionRequestStatus =
    | 'PENDING'
    | 'AUTO_APPROVED'
    | 'AUTO_DENIED'
    | 'APPROVED'
    | 'DENIED';

export interface PermissionRequest {
    id: string;
    media_id: string;
    media_title: string;
    media_hash: string;
    creator_id: string;
    requester_name: string;
    requester_email: string;
    requester_purpose: string;
    operation: PermissionOperation;
    status: PermissionRequestStatus;
    created_at: string;
    resolved_at: string | null;
    decision_note?: string;
}

export interface StoredPolicyMetadata {
    policy: GranularPolicyState;
    requests?: PermissionRequest[];
}

/**
 * Serializes a 7-dimension GranularPolicyState and requests into a compact string
 * preserving full backward compatibility with the database text column.
 * Format: `<primary_action>#<json_payload>`
 */
export function serializePolicy(
    policy: GranularPolicyState,
    requests: PermissionRequest[] = []
): {
    allow_ai_editing: string;
    allow_ai_training: boolean;
    allow_face_swap: boolean;
    allow_commercial: boolean;
} {
    const primaryEditing =
        policy.ai_editing === 'allow' ? 'allowed' : policy.ai_editing === 'deny' ? 'prohibited' : 'require_approval';

    const payload: StoredPolicyMetadata = {
        policy,
        requests,
    };

    const serializedMetadata = `${primaryEditing}#${JSON.stringify(payload)}`;

    return {
        allow_ai_editing: serializedMetadata,
        allow_ai_training: policy.ai_training === 'allow',
        allow_face_swap: policy.face_swapping === 'allow',
        allow_commercial: policy.commercial_use === 'allow',
    };
}

/**
 * Parses a stored database policy record into a full 7-dimension GranularPolicyState.
 */
export function parseStoredPolicy(dbRecord?: {
    allow_ai_editing?: string | null;
    allow_ai_training?: boolean | null;
    allow_face_swap?: boolean | null;
    allow_commercial?: boolean | null;
} | null): GranularPolicyState {
    if (!dbRecord) return { ...DEFAULT_POLICY };

    const rawEditing = dbRecord.allow_ai_editing || '';

    // Check if serialized JSON metadata is present
    if (rawEditing.includes('#')) {
        try {
            const [, jsonStr] = rawEditing.split('#');
            const parsed = JSON.parse(jsonStr);
            const policyObj: Partial<GranularPolicyState> = parsed.policy || parsed;
            return {
                ai_editing: policyObj.ai_editing || 'require_approval',
                face_swapping: policyObj.face_swapping || (dbRecord.allow_face_swap ? 'allow' : 'deny'),
                image_to_video: policyObj.image_to_video || 'require_approval',
                style_transfer: policyObj.style_transfer || 'require_approval',
                commercial_use: policyObj.commercial_use || (dbRecord.allow_commercial ? 'allow' : 'deny'),
                redistribution: policyObj.redistribution || 'require_approval',
                ai_training: policyObj.ai_training || (dbRecord.allow_ai_training ? 'allow' : 'deny'),
            };
        } catch {
            // Fallback to individual column parsing below
        }
    }

    // Fallback parsing from existing legacy database columns
    const editingAction: PolicyAction =
        rawEditing.startsWith('allowed') ? 'allow' : rawEditing.startsWith('prohibited') ? 'deny' : 'require_approval';

    return {
        ai_editing: editingAction,
        face_swapping: dbRecord.allow_face_swap ? 'allow' : 'deny',
        image_to_video: 'require_approval',
        style_transfer: 'require_approval',
        commercial_use: dbRecord.allow_commercial ? 'allow' : 'deny',
        redistribution: 'require_approval',
        ai_training: dbRecord.allow_ai_training ? 'allow' : 'deny',
    };
}

/**
 * Extracts stored permission requests from a database record.
 */
export function parseStoredRequests(dbRecord?: {
    allow_ai_editing?: string | null;
} | null): PermissionRequest[] {
    if (!dbRecord?.allow_ai_editing) return [];
    const rawEditing = dbRecord.allow_ai_editing;
    if (rawEditing.includes('#')) {
        try {
            const [, jsonStr] = rawEditing.split('#');
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed.requests)) {
                return parsed.requests;
            }
        } catch {
            return [];
        }
    }
    return [];
}
