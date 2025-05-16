import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Detection, ListedDetection, DetectionTags } from '@/api/models'
import { ExtractedProperties } from '@/components/ExtractedProperties'
import { ArrowUpIcon, MessageSquareIcon } from 'lucide-react'
import { PostReaction } from '@/components/PostReaction'
import { RelevancyBadge } from "./RelevancyBadge"

interface PostDialogProps {
  detection: ListedDetection
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PostDialog({ detection, open, onOpenChange }: PostDialogProps) {
  const { is_relevant, properties } = detection.detection

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>r/{detection.source_post?.subreddit}</span>
            <RelevancyBadge isRelevant={is_relevant} compact={false} />
          </div>
          <DialogTitle className="text-xl font-semibold mt-1">{detection.source_post?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {properties && Object.keys(properties).length > 0 && (
            <ExtractedProperties properties={properties} />
          )}
          
          <div className="text-sm whitespace-pre-wrap">
            {detection.source_post?.content}
          </div>

          <div className="flex justify-between items-center pt-4 text-sm text-muted-foreground border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ArrowUpIcon className="h-4 w-4" />
                <span>{detection.source_post?.score}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquareIcon className="h-4 w-4" />
                <span>{detection.source_post?.num_comments} comments</span>
              </div>
              
              <PostReaction 
                detection={detection} 
              />
            </div>
            <a 
              href={`https://reddit.com${detection.source_post?.permalink}`} 
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