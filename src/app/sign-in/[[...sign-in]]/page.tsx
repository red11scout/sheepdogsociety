import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img
          src="/logo.png"
          alt="Sheepdog Society"
          className="h-20 w-20 rounded-lg"
        />
        <h1 className="text-2xl font-bold">Sheepdog Society</h1>
        <p className="text-sm text-muted-foreground">Men of Faith</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border-border shadow-xl",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            formButtonPrimary: "bg-primary hover:bg-primary/90",
          },
        }}
      />
    </div>
  );
}
