import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization') || ''
    
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: callerUser }, error: userError } = await callerClient.auth.getUser()

    if (userError || !callerUser) {
      return new Response(JSON.stringify({ error: 'No autorizado: ' + (userError?.message || 'Token invalido') }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = callerUser.id

    // Use service role to verify caller's role
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!callerProfile || !['SUPERADMIN', 'MANAGER'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Sin permisos de administrador' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const { email, password, full_name, role, department } = await req.json()

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create the user using admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: role || 'AGENTE', department: department || 'ventas' }
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Upsert profile with service role (bypasses RLS)
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: newUser.user!.id,
      full_name,
      email,
      role: role || 'AGENTE',
      department: department || 'ventas',
      status: 'online',
      avatar_url: null,
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile upsert error:', profileError.message)
    }

    return new Response(JSON.stringify({ success: true, id: newUser.user!.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
