-- Public share links for assignment results
-- Creates expiring tokenized shares that can be viewed without authentication.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.assignment_result_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_assignment_id UUID NOT NULL REFERENCES public.group_assignments(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assignment_result_shares_assignment
  ON public.assignment_result_shares(group_assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_result_shares_expires
  ON public.assignment_result_shares(expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.assignment_result_shares ENABLE ROW LEVEL SECURITY;

-- Coaches/Coxswains with access can view their own generated shares.
DROP POLICY IF EXISTS "Coaches can view assignment shares" ON public.assignment_result_shares;
CREATE POLICY "Coaches can view assignment shares"
ON public.assignment_result_shares
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_assignments ga
    LEFT JOIN public.team_members tm
      ON tm.team_id = ga.team_id
     AND tm.user_id = auth.uid()
     AND tm.role IN ('coach', 'coxswain')
    LEFT JOIN public.organization_members om
      ON om.org_id = ga.org_id
     AND om.user_id = auth.uid()
     AND om.role IN ('owner', 'admin', 'coach')
    WHERE ga.id = assignment_result_shares.group_assignment_id
      AND (tm.user_id IS NOT NULL OR om.user_id IS NOT NULL)
  )
);

-- RPC: create a one-time share token for an assignment.
CREATE OR REPLACE FUNCTION public.create_assignment_results_share(
  p_group_assignment_id UUID,
  p_expires_in_hours INTEGER DEFAULT 168
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
  v_token_hash TEXT;
  v_expires_at TIMESTAMPTZ;
  v_has_access BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.group_assignments ga
    LEFT JOIN public.team_members tm
      ON tm.team_id = ga.team_id
     AND tm.user_id = v_user_id
     AND tm.role IN ('coach', 'coxswain')
    LEFT JOIN public.organization_members om
      ON om.org_id = ga.org_id
     AND om.user_id = v_user_id
     AND om.role IN ('owner', 'admin', 'coach')
    WHERE ga.id = p_group_assignment_id
      AND (tm.user_id IS NOT NULL OR om.user_id IS NOT NULL)
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'You do not have access to this assignment';
  END IF;

  v_token := encode(extensions.gen_random_bytes(18), 'hex');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + make_interval(hours => GREATEST(COALESCE(p_expires_in_hours, 168), 1));

  INSERT INTO public.assignment_result_shares (
    group_assignment_id,
    token_hash,
    created_by,
    expires_at
  ) VALUES (
    p_group_assignment_id,
    v_token_hash,
    v_user_id,
    v_expires_at
  );

  RETURN jsonb_build_object(
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$$;

-- RPC: resolve a public share token into assignment + result rows.
CREATE OR REPLACE FUNCTION public.resolve_assignment_results_share(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash TEXT;
  v_share RECORD;
  v_assignment JSONB;
  v_rows JSONB;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN NULL;
  END IF;

  v_token_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');

  SELECT ars.*
  INTO v_share
  FROM public.assignment_result_shares ars
  WHERE ars.token_hash = v_token_hash
    AND ars.revoked_at IS NULL
    AND ars.expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', ga.id,
    'team_id', ga.team_id,
    'org_id', ga.org_id,
    'template_id', ga.template_id,
    'scheduled_date', ga.scheduled_date,
    'title', ga.title,
    'instructions', ga.instructions,
    'created_at', ga.created_at,
    'template_name', wt.name,
    'canonical_name', wt.canonical_name,
    'workout_structure', wt.workout_structure,
    'workout_type', wt.workout_type,
    'training_zone', wt.training_zone,
    'is_test_template', wt.is_test
  )
  INTO v_assignment
  FROM public.group_assignments ga
  LEFT JOIN public.workout_templates wt ON wt.id = ga.template_id
  WHERE ga.id = v_share.group_assignment_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', dwa.id,
        'athlete_id', dwa.athlete_id,
        'athlete_name', trim(concat_ws(' ', a.first_name, a.last_name)),
        'squad', ta.squad,
        'team_id', dwa.team_id,
        'team_name', t.name,
        'weight_kg', a.weight_kg,
        'result_weight_kg', dwa.result_weight_kg,
        'side', a.side,
        'is_coxswain', (a.side = 'coxswain'),
        'completed', dwa.completed,
        'completed_at', dwa.completed_at,
        'result_time_seconds', dwa.result_time_seconds,
        'result_distance_meters', dwa.result_distance_meters,
        'result_split_seconds', dwa.result_split_seconds,
        'result_stroke_rate', dwa.result_stroke_rate,
        'result_intervals', dwa.result_intervals
      )
      ORDER BY a.last_name NULLS LAST, a.first_name NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM public.daily_workout_assignments dwa
  LEFT JOIN public.athletes a ON a.id = dwa.athlete_id
  LEFT JOIN public.team_athletes ta ON ta.athlete_id = dwa.athlete_id AND ta.team_id = dwa.team_id
  LEFT JOIN public.teams t ON t.id = dwa.team_id
  WHERE dwa.group_assignment_id = v_share.group_assignment_id;

  RETURN jsonb_build_object(
    'share_id', v_share.id,
    'expires_at', v_share.expires_at,
    'assignment', v_assignment,
    'rows', v_rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_assignment_results_share(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_assignment_results_share(TEXT) TO anon, authenticated;
