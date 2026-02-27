import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.16.0?target=deno'

const cryptoProvider = Stripe.createSubtleCryptoProvider()
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response('Webhook signature invalid', { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        let userId = session.metadata?.user_id
        const courseId = session.metadata?.course_id
        const paymentType = session.metadata?.payment_type || 'onetime'
        const customerEmail = session.customer_details?.email || session.customer_email

        if (!courseId) { console.error('Missing course_id in metadata:', session.id); break }

        // Idempotenz: Bereits verarbeitet?
        const { data: alreadyDone } = await supabase.from('purchases')
          .select('id').eq('stripe_checkout_session_id', session.id).eq('status', 'completed').limit(1)
        if (alreadyDone?.length) {
          console.log(`Already processed: session=${session.id}`)
          break
        }

        // Payment Link flow: user_id fehlt, User ueber Email suchen (effizient via RPC)
        if (!userId && customerEmail) {
          const { data: foundId } = await supabase.rpc('get_user_id_by_email', { lookup_email: customerEmail })
          if (foundId) {
            userId = foundId
            console.log(`Payment Link: matched email to user ${userId}`)
          }
        }

        if (userId) {
          // User bekannt: Bestehenden Purchase updaten (In-App Checkout)
          const { data: updated } = await supabase.from('purchases').update({
            user_id: userId,
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          }).eq('stripe_checkout_session_id', session.id).select('id')

          // Falls kein Purchase existiert (Payment Link), neuen erstellen
          if (!updated?.length) {
            const { error: insertErr } = await supabase.from('purchases').insert({
              user_id: userId, course_id: courseId,
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_subscription_id: session.subscription as string,
              payment_type: paymentType === 'subscription' ? 'subscription' : 'onetime',
              status: 'completed',
              customer_email: customerEmail,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency || 'chf',
            })
            // TOCTOU: Unique-Index-Verletzung = bereits verarbeitet → OK
            if (insertErr?.code === '23505') {
              console.log(`Duplicate insert caught (unique index): session=${session.id}`)
              break
            }
          }

          const accessData: Record<string, unknown> = {
            user_id: userId, course_id: courseId,
            access_type: paymentType === 'subscription' ? 'subscription' : 'purchase',
            created_at: new Date().toISOString(),
          }
          if (paymentType === 'subscription' && session.subscription) {
            accessData.stripe_subscription_id = session.subscription as string
          }

          await supabase.from('course_access').upsert(accessData, { onConflict: 'user_id,course_id' })
          console.log(`Access granted: user=${userId} course=${courseId} type=${paymentType}`)
        } else {
          // Kein User gefunden: Purchase als pending_signup speichern
          const { error: insertErr } = await supabase.from('purchases').insert({
            course_id: courseId,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_subscription_id: session.subscription as string,
            payment_type: paymentType === 'subscription' ? 'subscription' : 'onetime',
            status: 'pending_signup',
            customer_email: customerEmail,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || 'chf',
          })
          // TOCTOU: Unique-Index-Verletzung = bereits verarbeitet → OK
          if (insertErr?.code === '23505') {
            console.log(`Duplicate insert caught (unique index): session=${session.id}`)
            break
          }
          console.log(`Purchase pending_signup: course=${courseId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.user_id
        const courseId = subscription.metadata?.course_id

        if (userId && courseId) {
          await supabase.from('course_access').delete()
            .eq('user_id', userId).eq('course_id', courseId).eq('access_type', 'subscription')
          await supabase.from('purchases').update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subscription.id)
          console.log(`Access revoked (subscription cancelled): user=${userId} course=${courseId}`)
        } else {
          // Batch-Delete statt Loop (effizienter + keine Race Condition)
          await supabase.from('course_access').delete()
            .eq('stripe_subscription_id', subscription.id).eq('access_type', 'subscription')
          await supabase.from('purchases').update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subscription.id)
          console.log(`Access revoked by subscription_id: ${subscription.id}`)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent as string
        if (paymentIntentId) {
          const isFullRefund = charge.amount_refunded >= charge.amount
          const { data: purchase } = await supabase.from('purchases').select('user_id, course_id')
            .eq('stripe_payment_intent_id', paymentIntentId).single()
          if (purchase) {
            if (isFullRefund) {
              // Vollständige Rückerstattung: Zugriff entziehen
              await supabase.from('course_access').delete()
                .eq('user_id', purchase.user_id).eq('course_id', purchase.course_id).eq('access_type', 'purchase')
              await supabase.from('purchases').update({ status: 'refunded', updated_at: new Date().toISOString() })
                .eq('stripe_payment_intent_id', paymentIntentId)
              console.log(`Access revoked (full refund): user=${purchase.user_id} course=${purchase.course_id}`)
            } else {
              // Teilrückerstattung: Zugriff bleibt bestehen, nur Status markieren
              await supabase.from('purchases').update({ status: 'partially_refunded', updated_at: new Date().toISOString() })
                .eq('stripe_payment_intent_id', paymentIntentId)
              console.log(`Partial refund (access kept): user=${purchase.user_id} course=${purchase.course_id} refunded=${charge.amount_refunded}/${charge.amount}`)
            }
          }
        }
        break
      }

      default:
        console.log(`Unhandled event: ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
