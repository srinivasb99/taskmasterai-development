"use client"

import type React from "react"

import { Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "./components/ui/toaster"
import { useAuth } from "./lib/auth-context"

// Auth Pages
import Login from "./pages/auth/Login"
import Signup from "./pages/auth/Signup"
import ForgotPassword from "./pages/auth/ForgotPassword"

// Marketing Pages
import Home from "./pages/marketing/Home"
import Pricing from "./pages/marketing/Pricing"
import Demo from "./pages/marketing/Demo"

// App Pages
import Dashboard from "./pages/app/Dashboard"
import Tasks from "./pages/app/Tasks"
import Calendar from "./pages/app/Calendar"
import Timers from "./pages/app/Timers"
import Chat from "./pages/app/Chat"
import ChatRoom from "./pages/app/ChatRoom"
import Settings from "./pages/app/Settings"

// Layouts
import MarketingLayout from "./layouts/MarketingLayout"
import AppLayout from "./layouts/AppLayout"
import AuthLayout from "./layouts/AuthLayout"

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Marketing Routes */}
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/demo" element={<Demo />} />
        </Route>

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Protected App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/timers" element={<Timers />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:chatId" element={<ChatRoom />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

