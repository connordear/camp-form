// Roles that have access to the admin panel
export const ADMIN_PANEL_ROLES = ["admin", "hcp", "staff"] as const;

// Roles that have access to healthcare information
export const MEDICAL_ROLES = ["admin", "hcp"] as const;

// Roles that have all admin access
export const ADMIN_ROLES = ["admin"] as const;

export type AdminPanelRole = (typeof ADMIN_PANEL_ROLES)[number];
export type MedicalRole = (typeof MEDICAL_ROLES)[number];
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function hasAdminPanelAccess(role: string | null | undefined): boolean {
  return ADMIN_PANEL_ROLES.includes(role as AdminPanelRole);
}

export function hasMedicalAccess(role: string | null | undefined): boolean {
  return MEDICAL_ROLES.includes(role as MedicalRole);
}

export function isAdmin(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(role as AdminRole);
}
