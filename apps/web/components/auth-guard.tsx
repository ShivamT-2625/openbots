"use client";

import { Spinner } from "@openbots/ui/components/spinner";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useSession } from "@/lib/auth-client";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return <>{children}</>;
}
