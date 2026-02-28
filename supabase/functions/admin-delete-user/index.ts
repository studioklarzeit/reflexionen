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

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Nur Admins dürfen User löschen' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { targetUserId } = await req.json()
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'targetUserId fehlt' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Prevent self-deletion via admin endpoint
    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: 'Eigenen Account nicht über Admin-Panel löschen' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Delete user data in FK order (same as delete-account + notifications)
    await supabase.from('answers').delete().eq('user_id', targetUserId)
    await supabase.from('journal_entries').delete().eq('user_id', targetUserId)
    await supabase.from('body_entries').delete().eq('user_id', targetUserId)
    await supabase.from('checkin_entries').delete().eq('user_id', targetUserId)
    await supabase.from('meditation_logs').delete().eq('user_id', targetUserId)
    await supabase.from('chapter_progress').delete().eq('user_id', targetUserId)
    await supabase.from('friend_entries').delete().eq('user_id', targetUserId)
    await supabase.from('energy_entries').delete().eq('user_id', targetUserId)
    await supabase.from('pro_questions').delete().eq('user_id', targetUserId)
    await supabase.from('contact_messages').delete().eq('user_id', targetUserId)
    await supabase.from('notifications').delete().eq('user_id', targetUserId)
    await supabase.from('course_access').delete().eq('user_id', targetUserId)
    await supabase.from('profiles').delete().eq('id', targetUserId)

    // Delete auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId)
    if (deleteError) {
      console.error('Auth user delete error:', deleteError)
      return new Response(JSON.stringify({ error: 'Fehler beim Löschen des Auth-Accounts' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Admin deleted user: ${targetUserId} (by ${user.email})`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Admin delete user error:', err)
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
