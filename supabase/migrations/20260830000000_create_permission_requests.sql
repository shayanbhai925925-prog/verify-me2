-- Migration: Create hardened public.permission_requests table, validation triggers, and RLS policies
-- Purpose: Strict database-level security and ownership enforcement for VerifyMe Permission Network

CREATE TABLE IF NOT EXISTS public.permission_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requester_name TEXT,
    requester_email TEXT,
    requester_purpose TEXT,
    operation TEXT NOT NULL CHECK (
        operation IN (
            'ai_editing',
            'face_swapping',
            'image_to_video',
            'style_transfer',
            'commercial_use',
            'redistribution',
            'ai_training'
        )
    ),
    status TEXT NOT NULL CHECK (
        status IN (
            'PENDING',
            'AUTO_APPROVED',
            'AUTO_DENIED',
            'APPROVED',
            'DENIED'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    creator_decision TEXT,
    decision_note TEXT
);

-- Indexing for high-performance scoped lookups
CREATE INDEX IF NOT EXISTS idx_permission_requests_creator ON public.permission_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_media ON public.permission_requests(media_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON public.permission_requests(status);

-- Database-Level Integrity & Transition Trigger
CREATE OR REPLACE FUNCTION public.validate_permission_request()
RETURNS TRIGGER AS $$
DECLARE
    v_media_owner UUID;
BEGIN
    -- 1. On INSERT: verify target media exists and creator_id strictly matches media.user_id
    SELECT user_id INTO v_media_owner FROM public.media WHERE id = NEW.media_id;
    IF v_media_owner IS NULL THEN
        RAISE EXCEPTION 'Target media_id % does not exist in media table', NEW.media_id;
    END IF;
    
    IF NEW.creator_id != v_media_owner THEN
        RAISE EXCEPTION 'Mismatched creator_id: % does not match media owner %', NEW.creator_id, v_media_owner;
    END IF;

    -- 2. On UPDATE: enforce immutability of core fields and restrict status transitions
    IF TG_OP = 'UPDATE' THEN
        IF NEW.creator_id != OLD.creator_id OR NEW.media_id != OLD.media_id OR NEW.created_at != OLD.created_at OR NEW.operation != OLD.operation THEN
            RAISE EXCEPTION 'Cannot modify immutable permission request fields (creator_id, media_id, operation, created_at)';
        END IF;

        -- Prevent reverting resolved requests back to PENDING
        IF OLD.status IN ('APPROVED', 'DENIED', 'AUTO_APPROVED', 'AUTO_DENIED') AND NEW.status = 'PENDING' THEN
            RAISE EXCEPTION 'Cannot revert a resolved permission request back to PENDING';
        END IF;

        -- Only allow valid transitions from PENDING -> APPROVED or PENDING -> DENIED
        IF OLD.status = 'PENDING' AND NEW.status NOT IN ('APPROVED', 'DENIED', 'PENDING') THEN
            RAISE EXCEPTION 'Invalid status transition from PENDING to %', NEW.status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_permission_request ON public.permission_requests;
CREATE TRIGGER trg_validate_permission_request
    BEFORE INSERT OR UPDATE ON public.permission_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_permission_request();

-- Enable Row-Level Security
ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Creators can view requests for their media; Requesters can view their own requests
DROP POLICY IF EXISTS "permission_requests_select_policy" ON public.permission_requests;
CREATE POLICY "permission_requests_select_policy"
    ON public.permission_requests
    FOR SELECT
    USING (
        auth.uid() = creator_id
        OR (requester_id IS NOT NULL AND auth.uid() = requester_id)
        OR EXISTS (
            SELECT 1 FROM public.media
            WHERE public.media.id = permission_requests.media_id
            AND public.media.user_id = auth.uid()
        )
    );

-- 2. INSERT Policy: Authenticated users only, creator_id must match actual media owner
DROP POLICY IF EXISTS "permission_requests_insert_policy" ON public.permission_requests;
CREATE POLICY "permission_requests_insert_policy"
    ON public.permission_requests
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (requester_id IS NULL OR requester_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.media
            WHERE public.media.id = permission_requests.media_id
            AND public.media.user_id = permission_requests.creator_id
        )
    );

-- 3. UPDATE Policy: Only the verified creator of the media can update request decisions
DROP POLICY IF EXISTS "permission_requests_update_policy" ON public.permission_requests;
CREATE POLICY "permission_requests_update_policy"
    ON public.permission_requests
    FOR UPDATE
    USING (
        auth.uid() = creator_id
        AND EXISTS (
            SELECT 1 FROM public.media
            WHERE public.media.id = permission_requests.media_id
            AND public.media.user_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = creator_id
        AND creator_id = (SELECT user_id FROM public.media WHERE id = permission_requests.media_id)
    );

-- 4. DELETE Policy: Only the verified creator can delete requests for their media
DROP POLICY IF EXISTS "permission_requests_delete_policy" ON public.permission_requests;
CREATE POLICY "permission_requests_delete_policy"
    ON public.permission_requests
    FOR DELETE
    USING (
        auth.uid() = creator_id
        AND EXISTS (
            SELECT 1 FROM public.media
            WHERE public.media.id = permission_requests.media_id
            AND public.media.user_id = auth.uid()
        )
    );

-- Grant permissions to PostgREST API roles and reload schema cache
GRANT ALL ON TABLE public.permission_requests TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
