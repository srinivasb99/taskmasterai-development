import type React from "react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 md:p-8">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
          <span className="font-bold text-white">T</span>
        </div>
        <span className="font-bold text-xl text-white">TaskMaster AI</span>
      </Link>

      <div className="w-full max-w-md space-y-6">{children}</div>
    </div>
  )
}

