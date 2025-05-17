import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
  import type { ListedDetection, RedditPostAndComments } from '@/api/models'
  import { ExtractedProperties } from '@/components/ExtractedProperties'
  import { ArrowUpIcon, MessageSquareIcon } from 'lucide-react'
  import { DetectionReaction } from '@/components/DetectionReaction'
  import { RelevancyBadge } from "./RelevancyBadge"
  
  interface RedditDetectionDialogProps {
    listedDetection: ListedDetection
    open: boolean
    onOpenChange: (open: boolean) => void
  }
  
  export function RedditDetectionDialog({ listedDetection, open, onOpenChange }: RedditDetectionDialogProps) {
    const redditPost = listedDetection.source_post as RedditPostAndComments
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>r/{redditPost.post.subreddit}</span>
              <RelevancyBadge isRelevant={listedDetection.detection.is_relevant} compact={false} />
            </div>
            <DialogTitle className="text-xl font-semibold mt-1">{redditPost.post.title}</DialogTitle>
          </DialogHeader>
  
          <div className="space-y-4">
            {listedDetection.detection.properties && Object.keys(listedDetection.detection.properties).length > 0 && (
              <ExtractedProperties properties={listedDetection.detection.properties} />
            )}
            
            <div className="text-sm whitespace-pre-wrap">
              {redditPost.post.selftext}
            </div>
  
            <div className="flex justify-between items-center pt-4 text-sm text-muted-foreground border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <ArrowUpIcon className="h-4 w-4" />
                  <span>{redditPost.post.score}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquareIcon className="h-4 w-4" />
                  <span>{redditPost.post.num_comments} comments</span>
                </div>
                
                <DetectionReaction 
                  listedDetection={listedDetection} 
                />
              </div>
              <a 
                href={`https://reddit.com${redditPost.post.permalink}`} 
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