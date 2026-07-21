import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { AuthMiddleware, UserMiddleware } from "../_shared/authentication.ts";

async function adminUpdatePassword(req: Request, currentUser: any) {
  const { target_user_id, new_password } = await req.json();

  if (!target_user_id || !new_password) {
    return createErrorResponse(400, "Faltan parámetros");
  }

  // Verificar que el usuario actual es SUPERADMIN o MANAGER
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (!profile || (profile.role !== "SUPERADMIN" && profile.role !== "MANAGER")) {
    return createErrorResponse(403, "No tienes permisos para cambiar contraseñas");
  }

  // Cambiar la contraseña
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    target_user_id,
    { password: new_password }
  );

  if (error) {
    return createErrorResponse(500, error.message);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) =>
  OptionsMiddleware(req, async (req) =>
    AuthMiddleware(req, async (req) =>
      UserMiddleware(req, async (req, user) => {
        if (req.method === "POST") {
          return adminUpdatePassword(req, user);
        }
        return createErrorResponse(405, "Method Not Allowed");
      })
    )
  )
);
