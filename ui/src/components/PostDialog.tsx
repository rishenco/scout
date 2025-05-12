import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type DetectionWithPost } from '@/api/models'
import { Badge } from '@/components/ui/badge'
import { ExtractedProperties } from '@/components/ExtractedProperties'
import { ArrowUpIcon, MessageSquareIcon } from 'lucide-react'
import { PostReaction } from '@/components/PostReaction'

interface PostDialogProps {
  detection: DetectionWithPost
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PostDialog({ detection, open, onOpenChange }: PostDialogProps) {
  const { post, is_relevant, extracted_properties } = detection

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>r/{post.reddit.subreddit}</span>
            <Badge variant={is_relevant ? "default" : "secondary"} className="text-xs">
              {is_relevant ? 'Relevant' : 'Not Relevant'}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-semibold mt-1">{post.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {extracted_properties && Object.keys(extracted_properties).length > 0 && (
            <ExtractedProperties properties={extracted_properties} />
          )}
          
          <div className="text-sm whitespace-pre-wrap">
            {post.content}
          </div>

          <div className="flex justify-between items-center pt-4 text-sm text-muted-foreground border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ArrowUpIcon className="h-4 w-4" />
                <span>{post.reddit.score}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquareIcon className="h-4 w-4" />
                <span>{post.reddit.num_comments} comments</span>
              </div>
              
              <PostReaction detection={detection} />
            </div>
            <a 
              href={`https://reddit.com${post.reddit.permalink}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs underline hover:text-primary"
            >
              View on Reddit
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 