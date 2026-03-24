/**
 * Super Admin access control.
 * These emails have full administrative access to all site content.
 */
const SUPER_ADMIN_EMAILS = [
  "drew@dohardthings.ai",
  "jabsher@contractbuildersinc.com",
];

export function isSuperAdmin(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Check if a user has admin access (role-based or super admin).
 */
export function hasAdminAccess(role: string, email: string): boolean {
  return role === "admin" || isSuperAdmin(email);
}
