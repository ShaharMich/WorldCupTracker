import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create an account to save your favorite World Cup 2026 teams and players.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
