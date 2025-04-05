"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"

export function ForgotPasswordForm() {
  const { resetPassword, error: authError } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess(false)

    try {
      await resetPassword(email)
      setSuccess(true)
      toast({
        title: "Reset email sent",
        description: "Check your inbox for password reset instructions.",
      })
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.")
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: err.message || "Please check your email and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || authError) && (
        <div className="bg-red-900/20 border border-red-900 rounded-md p-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <p className="text-sm text-red-500">{error || authError}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-900 rounded-md p-3 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
          <p className="text-sm text-green-500">Password reset instructions have been sent to your email.</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-zinc-900 border-zinc-800"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || success}>
        {isLoading ? "Sending..." : "Send reset instructions"}
      </Button>
    </form>
  )
}

