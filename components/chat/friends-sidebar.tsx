"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import { Search, UserPlus, UserCheck, UserX, MessageSquare } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockUsers } from "@/lib/mock-data"

export function FriendsSidebar() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = mockUsers.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Mock friend requests
  const friendRequests = [
    {
      id: "req-1",
      user: mockUsers[3],
      type: "incoming",
    },
    {
      id: "req-2",
      user: mockUsers[4],
      type: "outgoing",
    },
  ]

  return (
    <div className="w-72 border-l border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold mb-4">Friends</h1>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search friends..."
            className="pl-8 bg-zinc-900 border-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="online" className="flex-1 flex flex-col">
        <TabsList className="px-4 py-2 bg-transparent border-b border-zinc-800 justify-start">
          <TabsTrigger value="online" className="data-[state=active]:bg-zinc-800">
            Online
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800">
            All
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-zinc-800">
            Pending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="online" className="flex-1 p-0 m-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="p-2">
              {filteredUsers.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <img
                          src={user.avatar || "/placeholder.svg"}
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      </Avatar>
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-1 ring-black"></div>
                    </div>
                    <div className="font-medium">{user.name}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="all" className="flex-1 p-0 m-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="p-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <img
                        src={user.avatar || "/placeholder.svg"}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    </Avatar>
                    <div className="font-medium">{user.name}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="pending" className="flex-1 p-0 m-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-4">
              {friendRequests.length > 0 ? (
                <>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 px-3 py-1">INCOMING REQUESTS</h3>
                    {friendRequests
                      .filter((req) => req.type === "incoming")
                      .map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-zinc-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <img
                                src={request.user.avatar || "/placeholder.svg"}
                                alt={request.user.name}
                                className="h-full w-full object-cover"
                              />
                            </Avatar>
                            <div className="font-medium">{request.user.name}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500">
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 px-3 py-1">OUTGOING REQUESTS</h3>
                    {friendRequests
                      .filter((req) => req.type === "outgoing")
                      .map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-zinc-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <img
                                src={request.user.avatar || "/placeholder.svg"}
                                alt={request.user.name}
                                className="h-full w-full object-cover"
                              />
                            </Avatar>
                            <div className="font-medium">{request.user.name}</div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
                  <UserPlus className="h-10 w-10 mb-2" />
                  <p>No pending friend requests</p>
                </div>
              )}

              <div className="px-3 pt-4">
                <Button className="w-full" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

