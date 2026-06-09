import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to sync your favorite World Cup 2026 teams and players.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
