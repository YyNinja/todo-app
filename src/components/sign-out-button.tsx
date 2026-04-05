"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className={
        className ??
        "text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      }
    >
      Sign out
    </button>
  );
}
