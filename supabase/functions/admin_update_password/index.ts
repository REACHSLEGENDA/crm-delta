import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as jose from "jsr:@panva/jose@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    
    // Verify JWT
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_JWT_KEYS = jose.createRemoteJWKSet(
      new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
    );
    const { payload } = await jose.jwtVerify(token, SUPABASE_JWT_KEYS, {
      issuer: Deno.env.get("SB_JWT_ISSUER") ?? `${SUPABASE_URL}/auth/v1`,
    });

    const currentUserId = payload.sub;

    const { target_user_id, new_password } = await req.json();

    if (!target_user_id || !new_password) {
      return new Response(JSON.stringify({ error: "Faltan parámetros" }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", currentUserId)
      .single();

    if (!profile || (profile.role !== "SUPERADMIN" && profile.role !== "MANAGER")) {
      return new Response(JSON.stringify({ error: "No tienes permisos" }), { status: 403, headers: corsHeaders });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      { password: new_password }
    );

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
