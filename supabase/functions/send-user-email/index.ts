import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''

const ALLOWED_ORIGINS = [
  'https://app.studioklarzeit.ch',
  'https://studioklarzeit.ch',
  'http://localhost:3000',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
  }
}

function buildHtml(subject: string, message: string): string {
  const lines = message.split('\n').map(l => `<p style="margin:0 0 12px;line-height:1.6;">${l || '&nbsp;'}</p>`).join('')
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#EDE6E2;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#ffffff;border-radius:12px;padding:36px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:28px;">
        <span style="display:inline-block;background:#C4A99B;color:#EDE6E2;font-size:18px;font-weight:400;padding:10px 16px;border-radius:8px;letter-spacing:-0.5px;">SK</span>
      </div>
      ${subject ? `<h1 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#3B3937;margin:0 0 20px;text-align:center;">${subject}</h1>` : ''}
      <div style="color:#3B3937;font-size:15px;">
        ${lines}
      </div>
    </div>
    <p style="text-align:center;margin-top:24px;font-size:12px;color:#9B9490;">
      Studio Klarzeit — Kurse, Meditation und Selbstreflexion
    </p>
  </div>
</body>
</html>`
}

serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // Auth check — prefer x-user-token (gateway-safe), fallback to Authorization
    const token = req.headers.get('x-user-token') || req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ungültiger Token' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Nur Admins' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { to, targetUserId, subject, message } = await req.json()

    if (!to || !message) {
      return new Response(JSON.stringify({ error: 'to und message sind erforderlich' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // 1. Save as in-app notification
    if (targetUserId) {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        sender_id: user.id,
        subject: subject || null,
        message,
      })
    }

    // 2. Send email via Resend
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set — email skipped, notification saved only')
      return new Response(JSON.stringify({ success: true, emailSent: false, notificationSaved: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const emailSubject = subject || 'Nachricht von Studio Klarzeit'
    const htmlBody = buildHtml(subject || '', message)

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Studio Klarzeit <noreply@studioklarzeit.ch>',
        to: [to],
        subject: emailSubject,
        html: htmlBody,
        text: message,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      console.error('Resend error:', err)
      return new Response(JSON.stringify({ error: 'E-Mail konnte nicht gesendet werden', detail: err, notificationSaved: true }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Email sent to ${to} by admin ${user.email}`)

    return new Response(JSON.stringify({ success: true, emailSent: true, notificationSaved: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Send user email error:', err)
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
