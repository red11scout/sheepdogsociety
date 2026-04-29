// Auth.js v5 catch-all route handler.
// Mounts /api/auth/signin, /api/auth/callback/*, /api/auth/signout, /api/auth/session, etc.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
