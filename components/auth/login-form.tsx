"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Github, Mail } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"

export function LoginForm() {
  const router = useRouter()
  const { signIn, signInWithGoogle, signInWithGithub, error: authError } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, rememberMe: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await signIn(formData.email, formData.password)
      // Router navigation is handled in the auth context
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.")
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: err.message || "Please check your credentials and try again.",
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm text-zinc-400 hover:text-white">
            Forgot password?
          </Link>
        </div>
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

      <div className="flex items-center space-x-2">
        <Checkbox id="remember-me" checked={formData.rememberMe} onCheckedChange={handleCheckboxChange} />
        <Label htmlFor="remember-me" className="text-sm font-normal">
          Remember me
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign in"}
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

