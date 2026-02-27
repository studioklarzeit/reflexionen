import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.16.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ungültiger Token' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { courseId, paymentType } = await req.json()
    if (!courseId || !paymentType) {
      return new Response(JSON.stringify({ error: 'courseId und paymentType erforderlich' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: course, error: courseError } = await supabase
      .from('courses').select('*').eq('id', courseId).eq('is_purchasable', true).single()

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: 'Kurs nicht gefunden oder nicht kaufbar' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingAccess } = await supabase
      .from('course_access').select('course_id').eq('user_id', user.id).eq('course_id', courseId).limit(1)

    if (existingAccess && existingAccess.length > 0) {
      return new Response(JSON.stringify({ error: 'Du hast bereits Zugriff auf diesen Kurs' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Doppelte Checkout-Sessions verhindern (Race Condition bei Doppelklick)
    const { data: pendingPurchase } = await supabase.from('purchases')
      .select('stripe_checkout_session_id')
      .eq('user_id', user.id).eq('course_id', courseId).eq('status', 'pending')
      .limit(1)

    if (pendingPurchase?.length) {
      // Bestehende Session bei Stripe prüfen — evtl. noch gültig
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          pendingPurchase[0].stripe_checkout_session_id
        )
        if (existingSession.status === 'open' && existingSession.url) {
          return new Response(JSON.stringify({ url: existingSession.url }), {
            headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }
      } catch (_) { /* Session abgelaufen oder ungültig → neue erstellen */ }
    }

    let priceId: string
    if (paymentType === 'onetime') {
      priceId = course.stripe_price_id_onetime
    } else if (paymentType === 'subscription') {
      priceId = course.stripe_price_id_subscription
    } else {
      return new Response(JSON.stringify({ error: 'Ungültiger paymentType' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Keine Stripe Price ID konfiguriert' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Origin validieren für Stripe Redirect-URLs
    const reqOrigin = req.headers.get('origin') || ''
    const safeOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0]

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: paymentType === 'subscription' ? 'subscription' : 'payment',
      success_url: `${safeOrigin}/?purchase_success=1&course_id=${courseId}`,
      cancel_url: `${safeOrigin}/?kurs=${course.sales_slug || courseId}`,
      metadata: { user_id: user.id, course_id: courseId, payment_type: paymentType },
      payment_method_types: paymentType === 'subscription' ? ['card'] : ['card', 'twint'],
      locale: 'de',
    }

    if (paymentType === 'subscription') {
      sessionParams.subscription_data = {
        metadata: { user_id: user.id, course_id: courseId },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    await supabase.from('purchases').insert({
      user_id: user.id, course_id: courseId,
      stripe_checkout_session_id: session.id,
      payment_type: paymentType, status: 'pending',
      amount: paymentType === 'onetime' ? course.price_onetime_amount : course.price_subscription_amount,
      currency: course.price_currency || 'chf',
      customer_email: user.email,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
