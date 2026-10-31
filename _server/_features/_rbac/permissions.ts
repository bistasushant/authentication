import { UserRole } from "@/_server/_features/_user/_enum/user-role.enum";

// ── Permission definitions ───────────────────────────────────────────────────

export const PERMISSIONS = {
  // Clip management
  CLIP_CREATE: "clip:create",
  CLIP_READ: "clip:read",
  CLIP_DELETE_OWN: "clip:delete:own",
  CLIP_DELETE_ANY: "clip:delete:any",

  // User management (admin only)
  USER_READ_ANY: "user:read:any",
  USER_UPDATE_ANY: "user:update:any",
  USER_DELETE_ANY: "user:delete:any",

  // Admin panel
  ADMIN_PANEL: "admin:panel",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ── Role → base permission sets ──────────────────────────────────────────────

const ROLE_BASE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    PERMISSIONS.CLIP_CREATE,
    PERMISSIONS.CLIP_READ,
    PERMISSIONS.CLIP_DELETE_OWN,
  ],
  [UserRole.ADMIN]: Object.values(PERMISSIONS) as Permission[],
};

// ── hasPermission ────────────────────────────────────────────────────────────

/**
 * Check whether a user has a specific permission.
 * ADMIN has all permissions. USER is checked against base + custom grants.
 */
export function hasPermission(
  role: UserRole,
  customPermissions: string[],
  permission: Permission
): boolean {
  if (role === UserRole.ADMIN) return true;

  const base = ROLE_BASE_PERMISSIONS[role] ?? [];
  return base.includes(permission) || customPermissions.includes(permission);
}
