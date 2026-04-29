// Minimal layout for the auth pages (/admin/sign-in, /admin/check-email).
// Bypasses the (app) layout's Clerk-aware shell so these pages stay reachable
// for unauthenticated visitors after the middleware swap.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bone text-iron px-4">
      {children}
    </main>
  );
}
