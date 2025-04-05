import { FileIcon } from "lucide-react"
import type { Attachment } from "@/lib/types"

interface MessageAttachmentProps {
  attachment: Attachment
}

export function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const isImage = attachment.type.startsWith("image/")

  return (
    <div className="rounded-md overflow-hidden">
      {isImage ? (
        <div className="relative">
          <img
            src={attachment.url || "/placeholder.svg"}
            alt={attachment.name}
            className="max-h-60 rounded-md object-contain"
          />
        </div>
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md bg-zinc-900 p-2 hover:bg-zinc-800 transition-colors"
        >
          <FileIcon className="h-5 w-5 text-zinc-400" />
          <div className="overflow-hidden">
            <p className="text-sm truncate">{attachment.name}</p>
            <p className="text-xs text-zinc-500">{(attachment.size / 1024).toFixed(1)} KB</p>
          </div>
        </a>
      )}
    </div>
  )
}

