"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Send, X } from "lucide-react"

interface MessageInputProps {
  onSendMessage: (content: string, files?: File[]) => void
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() || files.length > 0) {
      onSendMessage(message, files.length > 0 ? files : undefined)
      setMessage("")
      setFiles([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  return (
    <div className="border-t border-zinc-800 p-4">
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1 text-sm">
              <span className="truncate max-w-[150px]">{file.name}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeFile(index)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
        </Button>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-10 resize-none bg-zinc-900 border-zinc-800"
          rows={1}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={!message.trim() && files.length === 0}
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  )
}

