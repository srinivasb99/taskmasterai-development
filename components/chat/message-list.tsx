import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import type { Message } from "@/lib/types"
import { MessageAttachment } from "@/components/chat/message-attachment"

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => {
          const isCurrentUser = message.sender.id === "current-user"
          return (
            <div key={message.id} className={`flex gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              {!isCurrentUser && (
                <Avatar className="h-8 w-8">
                  <img
                    src={message.sender.avatar || "/placeholder.svg"}
                    alt={message.sender.name}
                    className="h-full w-full object-cover"
                  />
                </Avatar>
              )}
              <div className={`max-w-[70%] ${isCurrentUser ? "items-end" : "items-start"}`}>
                <div className="flex flex-col gap-1">
                  {!isCurrentUser && <span className="text-xs text-zinc-500">{message.sender.name}</span>}
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      isCurrentUser ? "bg-blue-600 text-white" : "bg-zinc-800 text-white"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment) => (
                        <MessageAttachment key={attachment.id} attachment={attachment} />
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-zinc-500">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              {isCurrentUser && (
                <Avatar className="h-8 w-8">
                  <img
                    src={message.sender.avatar || "/placeholder.svg"}
                    alt={message.sender.name}
                    className="h-full w-full object-cover"
                  />
                </Avatar>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

