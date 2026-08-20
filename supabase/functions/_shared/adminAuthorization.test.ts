import { describe, expect, it } from "vitest";
import {
  MIN_ADMIN_PASSWORD_LENGTH,
  canCreateRole,
  canCreateUsers,
  canResetUserPasswords,
} from "./adminAuthorization.ts";

describe("administrative authorization", () => {
  it("rejects inactive accounts and non-administrative roles", () => {
    expect(canCreateUsers("SUPERADMIN", false)).toBe(false);
    expect(canCreateUsers("MANAGER", false)).toBe(false);
    expect(canCreateUsers("AGENT", true)).toBe(false);
  });

  it("lets managers create agents and supervisors, but not managers", () => {
    expect(canCreateRole("MANAGER", "AGENT")).toBe(true);
    expect(canCreateRole("MANAGER", "SUPERVISOR")).toBe(true);
    expect(canCreateRole("MANAGER", "MANAGER")).toBe(false);
    expect(canCreateRole("MANAGER", "SUPERADMIN")).toBe(false);
  });

  it("allows only active superadmins to reset another user's password", () => {
    expect(canResetUserPasswords("SUPERADMIN", true)).toBe(true);
    expect(canResetUserPasswords("SUPERADMIN", false)).toBe(false);
    expect(canResetUserPasswords("MANAGER", true)).toBe(false);
  });

  it("requires strong administrative passwords", () => {
    expect(MIN_ADMIN_PASSWORD_LENGTH).toBe(12);
  });
});
