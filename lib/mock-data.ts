import type { Chat, Message, User } from "./types"

export const mockUsers: User[] = [
  {
    id: "current-user",
    name: "You",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "user-1",
    name: "Alex Johnson",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "user-2",
    name: "Sam Taylor",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "user-3",
    name: "Jordan Lee",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "user-4",
    name: "Casey Morgan",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "user-5",
    name: "Riley Smith",
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

export const mockChats: Chat[] = [
  {
    id: "chat-1",
    name: "Alex Johnson",
    isGroup: false,
    participants: [mockUsers[0], mockUsers[1]],
    lastMessage: "Hey, how's it going?",
    lastMessageTime: "10:30 AM",
  },
  {
    id: "chat-2",
    name: "Project Team",
    isGroup: true,
    participants: [mockUsers[0], mockUsers[1], mockUsers[2], mockUsers[3]],
    lastMessage: "Let's meet tomorrow at 2 PM",
    lastMessageTime: "2:45 PM",
  },
  {
    id: "chat-3",
    name: "Sam Taylor",
    isGroup: false,
    participants: [mockUsers[0], mockUsers[2]],
    lastMessage: "Did you see the latest design?",
    lastMessageTime: "Yesterday",
  },
  {
    id: "chat-4",
    name: "Design Team",
    isGroup: true,
    participants: [mockUsers[0], mockUsers[2], mockUsers[4], mockUsers[5]],
    lastMessage: "The new mockups look great!",
    lastMessageTime: "Yesterday",
  },
  {
    id: "chat-5",
    name: "Jordan Lee",
    isGroup: false,
    participants: [mockUsers[0], mockUsers[3]],
    lastMessage: "Can we reschedule our meeting?",
    lastMessageTime: "Monday",
  },
]

export const mockMessages: Message[] = [
  {
    id: "msg-1",
    chatId: "chat-1",
    content: "Hey, how's it going?",
    sender: mockUsers[1],
    timestamp: "2023-04-04T10:30:00Z",
    status: "read",
  },
  {
    id: "msg-2",
    chatId: "chat-1",
    content: "Pretty good! Working on that new project. How about you?",
    sender: mockUsers[0],
    timestamp: "2023-04-04T10:32:00Z",
    status: "read",
  },
  {
    id: "msg-3",
    chatId: "chat-1",
    content: "Same here. Have you seen the latest requirements?",
    sender: mockUsers[1],
    timestamp: "2023-04-04T10:33:00Z",
    status: "read",
  },
  {
    id: "msg-4",
    chatId: "chat-1",
    content: "Yes, I was just looking at them. We should discuss this in our next meeting.",
    sender: mockUsers[0],
    timestamp: "2023-04-04T10:35:00Z",
    status: "read",
  },
  {
    id: "msg-5",
    chatId: "chat-1",
    content: "Sounds good. I'll prepare some notes.",
    sender: mockUsers[1],
    timestamp: "2023-04-04T10:36:00Z",
    status: "read",
    attachments: [
      {
        id: "file-1",
        name: "project_notes.pdf",
        type: "application/pdf",
        url: "/placeholder.svg?height=100&width=100",
        size: 2500000,
      },
    ],
  },
  {
    id: "msg-6",
    chatId: "chat-2",
    content: "Hey team, let's meet tomorrow at 2 PM to discuss the project timeline.",
    sender: mockUsers[1],
    timestamp: "2023-04-04T14:45:00Z",
    status: "read",
  },
  {
    id: "msg-7",
    chatId: "chat-2",
    content: "Works for me!",
    sender: mockUsers[2],
    timestamp: "2023-04-04T14:50:00Z",
    status: "read",
  },
  {
    id: "msg-8",
    chatId: "chat-2",
    content: "I'll be there.",
    sender: mockUsers[0],
    timestamp: "2023-04-04T14:55:00Z",
    status: "read",
  },
  {
    id: "msg-9",
    chatId: "chat-2",
    content: "Great, I'll send a calendar invite.",
    sender: mockUsers[3],
    timestamp: "2023-04-04T15:00:00Z",
    status: "read",
  },
  {
    id: "msg-10",
    chatId: "chat-2",
    content: "Here's the design mockup we'll be discussing.",
    sender: mockUsers[1],
    timestamp: "2023-04-04T15:05:00Z",
    status: "read",
    attachments: [
      {
        id: "file-2",
        name: "design_mockup.png",
        type: "image/png",
        url: "/placeholder.svg?height=300&width=500",
        size: 1500000,
      },
    ],
  },
]

