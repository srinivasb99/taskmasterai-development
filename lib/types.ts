export interface User {
  id: string
  name: string
  avatar: string
}

export interface Chat {
  id: string
  name: string
  isGroup: boolean
  participants: User[]
  lastMessage: string
  lastMessageTime: string
}

export interface Attachment {
  id: string
  name: string
  type: string
  url: string
  size: number
}

export interface Message {
  id: string
  chatId: string
  content: string
  sender: User
  timestamp: string
  status: "sent" | "delivered" | "read"
  attachments?: Attachment[]
}

