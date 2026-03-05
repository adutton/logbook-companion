// @ts-expect-error -- Deno resolves remote URL imports at runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'notifications@mail.readyall.org';
    const adminEmail = 'samdgammon@gmail.com';

    if (!supabaseUrl || !supabaseServiceRoleKey || !resendApiKey) {
      return jsonResponse(500, { error: 'Missing required server configuration.' });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Missing authorization token.' });
    }

    const jwt = authHeader.replace('Bearer ', '').trim();
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return jsonResponse(401, { error: 'Invalid auth token.' });
    }

    const body = await req.json();
    const displayName = (body.displayName || '').trim();
    const message = (body.message || '').trim();

    if (!displayName || displayName.length < 2) {
      return jsonResponse(400, { error: 'Display name is required (min 2 characters).' });
    }
    if (message.length > 1000) {
      return jsonResponse(400, { error: 'Message must be under 1000 characters.' });
    }

    // Check for existing request
    const { data: existing } = await supabase
      .from('coaching_access_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        return jsonResponse(409, { error: 'You already have a pending request.' });
      }
      if (existing.status === 'approved') {
        return jsonResponse(409, { error: 'You already have coaching access.' });
      }
      // If rejected, allow re-submission by updating
      const { error: updateErr } = await supabase
        .from('coaching_access_requests')
        .update({ display_name: displayName, message, status: 'pending', reviewed_by: null, reviewed_at: null })
        .eq('id', existing.id);
      if (updateErr) {
        return jsonResponse(500, { error: 'Failed to resubmit request.' });
      }
    } else {
      // Insert new request
      const { error: insertErr } = await supabase
        .from('coaching_access_requests')
        .insert({ user_id: user.id, display_name: displayName, message });
      if (insertErr) {
        console.error('[request-coaching-access] Insert error:', insertErr);
        return jsonResponse(500, { error: 'Failed to submit request.' });
      }
    }

    // Send email notification to admin
    const safeName = escapeHtml(displayName);
    const safeMessage = message ? escapeHtml(message) : '<em>No message provided</em>';
    const userEmail = user.email ? escapeHtml(user.email) : 'unknown';

    const emailPayload = {
      from: `Logbook Companion <${resendFromEmail}>`,
      to: [adminEmail],
      subject: `Coaching Access Request from ${displayName}`,
      html: `
        <div style="font-family: Inter, system-ui, -apple-system, sans-serif; line-height: 1.6; color: #111827; max-width: 560px;">
          <h2 style="margin: 0 0 16px;">New Coaching Access Request</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Name</td><td style="padding: 8px 12px; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Email</td><td style="padding: 8px 12px;">${userEmail}</td></tr>
            <tr><td style="padding: 8px 12px; color: #6b7280; font-size: 14px; vertical-align: top;">Message</td><td style="padding: 8px 12px;">${safeMessage}</td></tr>
          </table>
          <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280;">Log in to <a href="https://log.readyall.org/team-management" style="color: #2563eb;">Logbook Companion</a> to approve or reject this request.</p>
        </div>
      `,
    };

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error('[request-coaching-access] Resend error:', { status: resendResponse.status, body: errText });
      // Request was saved — email failure is non-fatal
    }

    return jsonResponse(200, { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return jsonResponse(500, { error: message });
  }
});
