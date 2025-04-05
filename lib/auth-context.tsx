"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true)
      if (user) {
        setUser(user)

        // Check if user exists in Firestore
        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)

        // If user doesn't exist in Firestore, create a new document
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          })
        } else {
          // Update last login time
          await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setError(null)
      setLoading(true)

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: name,
      })

      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        displayName: name,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        plan: "free", // Default plan
      })

      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error signing up:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error signing in:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setError(null)
      setLoading(true)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Check if this is a new user
      const userRef = doc(db, "users", result.user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        // Create user document in Firestore for new Google users
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          plan: "free", // Default plan
        })
      }

      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error signing in with Google:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGithub = async () => {
    try {
      setError(null)
      setLoading(true)
      const provider = new GithubAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Check if this is a new user
      const userRef = doc(db, "users", result.user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        // Create user document in Firestore for new GitHub users
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          plan: "free", // Default plan
        })
      }

      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error signing in with GitHub:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setError(null)
      await signOut(auth)
      router.push("/login")
    } catch (error: any) {
      console.error("Error signing out:", error)
      setError(error.message)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setError(null)
      setLoading(true)
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      console.error("Error resetting password:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGithub,
    logout,
    resetPassword,
    error,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

