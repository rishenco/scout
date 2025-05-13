import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Detection, Post, UserClassification } from '@/api/models'
import { ExtractedProperties } from '@/components/ExtractedProperties'
import { ArrowUpIcon, MessageSquareIcon } from 'lucide-react'
import { PostReaction } from '@/components/PostReaction'
import { RelevancyBadge } from "./RelevancyBadge"

interface PostDialogProps {
  detection: Detection
  post: Post
  userClassification?: UserClassification
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PostDialog({ detection, post, userClassification, open, onOpenChange }: PostDialogProps) {
  const { is_relevant, extracted_properties } = detection

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>r/{post.reddit.subreddit}</span>
            <RelevancyBadge isRelevant={is_relevant} compact={false} />
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
              
              <PostReaction 
                detection={detection} 
                userClassification={userClassification} 
              />
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