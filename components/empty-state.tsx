import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import Link from "next/link"

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900">
        <MessageSquare className="h-10 w-10 text-zinc-500" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold">No chat selected</h2>
      <p className="mt-2 text-zinc-500">Select a chat from the sidebar or create a new one to start messaging.</p>
      <Link href="/chat/new" className="mt-6">
        <Button>Start a new chat</Button>
      </Link>
    </div>
  )
}

