import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  MIN_ADMIN_PASSWORD_LENGTH,
  canCreateRole,
  canCreateUsers,
} from "../_shared/adminAuthorization.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido" }, 405);

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "No autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Configuración incompleta del servidor" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.slice("Bearer ".length);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return jsonResponse({ error: "Sesión inválida" }, 401);
  }

  const { data: actor, error: actorError } = await admin
    .from("profiles")
    .select("id,role,team_id,active")
    .eq("id", authData.user.id)
    .single();

  if (actorError || !actor || !canCreateUsers(actor.role, actor.active)) {
    return jsonResponse({ error: "No tienes permisos para registrar usuarios" }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Solicitud inválida" }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const firstName = typeof payload.first_name === "string" ? payload.first_name.trim() : "";
  const lastName = typeof payload.last_name === "string" ? payload.last_name.trim() : "";
  const requestedRole = typeof payload.role === "string" ? payload.role : "AGENT";
  const department = typeof payload.department === "string" ? payload.department : "Ventas";
  const requestedTeamId = typeof payload.team_id === "string" ? payload.team_id : null;

  if (!email || !firstName || !lastName || password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return jsonResponse({ error: `Completa los datos y usa una contraseña de al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres` }, 400);
  }

  if (!canCreateRole(actor.role, requestedRole)) {
    return jsonResponse({ error: "No puedes asignar el rol solicitado" }, 403);
  }

  if (!["Ventas", "Retencion", "Cumplimiento"].includes(department)) {
    return jsonResponse({ error: "Departamento no permitido" }, 400);
  }

  const assignedTeamId = actor.role === "MANAGER"
    ? actor.team_id
    : requestedTeamId ?? actor.team_id;

  if (actor.role === "MANAGER" && !assignedTeamId) {
    return jsonResponse({ error: "El gerente debe tener un equipo asignado" }, 400);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (createError || !created.user) {
    return jsonResponse({ error: createError?.message ?? "No se pudo crear el usuario" }, 400);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      role: requestedRole,
      department,
      team_id: assignedTeamId,
      active: true,
    })
    .eq("id", created.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return jsonResponse({ error: "No se pudo configurar el perfil del usuario" }, 500);
  }

  return jsonResponse({ success: true, user_id: created.user.id }, 201);
});
