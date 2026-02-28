import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
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

    // Sicherheitscheck: Nur bestätigte E-Mails dürfen Purchases claimen
    // Verhindert, dass jemand mit fremder E-Mail Käufe übernimmt
    if (!user.email_confirmed_at) {
      return new Response(JSON.stringify({ claimed: 0, reason: 'email_unconfirmed' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Pending purchases für diese Email suchen
    const { data: pendingPurchases, error: fetchError } = await supabase
      .from('purchases')
      .select('*')
      .eq('customer_email', user.email)
      .eq('status', 'pending_signup')

    if (fetchError) {
      console.error('Error fetching pending purchases:', fetchError)
      return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!pendingPurchases?.length) {
      return new Response(JSON.stringify({ claimed: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let claimed = 0
    for (const purchase of pendingPurchases) {
      // Purchase dem User zuweisen
      await supabase.from('purchases').update({
        user_id: user.id,
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('id', purchase.id)

      // Course access gewähren
      const accessData: Record<string, unknown> = {
        user_id: user.id,
        course_id: purchase.course_id,
        access_type: purchase.payment_type === 'subscription' ? 'subscription' : 'purchase',
        created_at: new Date().toISOString(),
      }
      if (purchase.payment_type === 'subscription' && purchase.stripe_subscription_id) {
        accessData.stripe_subscription_id = purchase.stripe_subscription_id
      }

      await supabase.from('course_access').upsert(accessData, { onConflict: 'user_id,course_id' })
      claimed++
      console.log(`Claimed purchase: user=${user.id} course=${purchase.course_id}`)
    }

    return new Response(JSON.stringify({ claimed }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Claim purchases error:', err)
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
