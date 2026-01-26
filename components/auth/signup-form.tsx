"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Github, Mail } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"

export function SignupForm() {
  const router = useRouter()
  const { signUp, signInWithGoogle, signInWithGithub, error: authError } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, agreeToTerms: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      await signUp(formData.email, formData.password, formData.name)
      // Router navigation is handled in the auth context
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.")
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: err.message || "Please check your information and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError("")
      await signInWithGoogle()
      // Router navigation is handled in the auth context
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.")
      toast({
        variant: "destructive",
        title: "Google sign in failed",
        description: err.message || "Please try again later.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGithubSignIn = async () => {
    try {
      setIsLoading(true)
      setError("")
      await signInWithGithub()
      // Router navigation is handled in the auth context
    } catch (err: any) {
      setError(err.message || "Failed to sign in with GitHub.")
      toast({
        variant: "destructive",
        title: "GitHub sign in failed",
        description: err.message || "Please try again later.",
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

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="John Doe"
          value={formData.name}
          onChange={handleChange}
          required
          className="bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          value={formData.email}
          onChange={handleChange}
          required
          className="bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          required
          className="bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          className="bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          id="agree-to-terms"
          checked={formData.agreeToTerms}
          onCheckedChange={handleCheckboxChange}
          className="mt-1"
        />
        <Label htmlFor="agree-to-terms" className="text-sm font-normal">
          I agree to the{" "}
          <a href="/terms" className="text-white hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-white hover:underline">
            Privacy Policy
          </a>
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !formData.agreeToTerms}>
        {isLoading ? "Creating account..." : "Create account"}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-black px-2 text-zinc-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleSignIn}>
          <Mail className="h-4 w-4 mr-2" />
          Google
        </Button>
        <Button variant="outline" type="button" disabled={isLoading} onClick={handleGithubSignIn}>
          <Github className="h-4 w-4 mr-2" />
          GitHub
        </Button>
      </div>
    </form>
  )
}

