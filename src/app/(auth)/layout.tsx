// Minimal layout for the auth pages (/admin/sign-in).
// Bypasses the (app) layout's shell so these pages stay reachable
// for unauthenticated visitors.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      {children}
    </main>
  );
}
