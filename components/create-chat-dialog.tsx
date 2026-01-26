"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { mockUsers } from "@/lib/mock-data"
import { Avatar } from "@/components/ui/avatar"
import { Check, User, Users } from "lucide-react"

interface CreateChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateChatDialog({ open, onOpenChange }: CreateChatDialogProps) {
  const router = useRouter()
  const [chatType, setChatType] = useState<"direct" | "group">("direct")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = mockUsers.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const toggleUserSelection = (userId: string) => {
    if (chatType === "direct" && selectedUsers.length === 1 && !selectedUsers.includes(userId)) {
      setSelectedUsers([userId])
      return
    }

    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  const handleCreateChat = () => {
    // In a real app, we would create a chat in the database
    // For now, we'll just simulate it by redirecting to a mock chat
    const newChatId = `new-${Date.now()}`
    router.push(`/chat/${newChatId}`)
    onOpenChange(false)

    // Reset form
    setSelectedUsers([])
    setGroupName("")
    setSearchQuery("")
    setChatType("direct")
  }

  const isCreateDisabled =
    (chatType === "direct" && selectedUsers.length !== 1) ||
    (chatType === "group" && (selectedUsers.length < 2 || !groupName.trim()))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 text-white border-zinc-800">
        <DialogHeader>
          <DialogTitle>Create a new chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup
            value={chatType}
            onValueChange={(value) => {
              setChatType(value as "direct" | "group")
              setSelectedUsers([])
            }}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="direct" id="direct" />
              <Label htmlFor="direct" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Direct Message
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="group" id="group" />
              <Label htmlFor="group" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Group Chat
              </Label>
            </div>
          </RadioGroup>

          {chatType === "group" && (
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{chatType === "direct" ? "Select a user" : "Select users"}</Label>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border-zinc-800"
            />
            <div className="h-60 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900 p-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between rounded-md p-2 cursor-pointer ${
                      selectedUsers.includes(user.id) ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                    }`}
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <img
                          src={user.avatar || "/placeholder.svg"}
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      </Avatar>
                      <span>{user.name}</span>
                    </div>
                    {selectedUsers.includes(user.id) && <Check className="h-4 w-4 text-green-500" />}
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">No users found</div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateChat} disabled={isCreateDisabled}>
            Create Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

