import Link from "next/link"
import type { Metadata } from "next"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password | TaskMaster AI",
  description: "Reset your TaskMaster AI password",
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 md:p-8">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
          <span className="font-bold text-white">T</span>
        </div>
        <span className="font-bold text-xl text-white">TaskMaster AI</span>
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Forgot password?</h1>
          <p className="text-zinc-400 mt-2">Enter your email to reset your password</p>
        </div>

        <ForgotPasswordForm />

        <div className="text-center text-sm text-zinc-400">
          <p>
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-white hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

