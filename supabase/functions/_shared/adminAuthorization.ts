export type AdministrativeRole = "SUPERADMIN" | "MANAGER" | "SUPERVISOR" | "AGENT";

export const MIN_ADMIN_PASSWORD_LENGTH = 12;

export const canCreateUsers = (role: string, active: boolean) =>
  active && (role === "SUPERADMIN" || role === "MANAGER");

export const canCreateRole = (actorRole: string, requestedRole: string) => {
  if (actorRole === "SUPERADMIN") {
    return ["AGENT", "SUPERVISOR", "MANAGER"].includes(requestedRole);
  }

  if (actorRole === "MANAGER") {
    return ["AGENT", "SUPERVISOR"].includes(requestedRole);
  }

  return false;
};

export const canResetUserPasswords = (role: string, active: boolean) =>
  active && role === "SUPERADMIN";
