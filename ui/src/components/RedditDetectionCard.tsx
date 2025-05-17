import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ArrowUpIcon, MessageSquareIcon, ExternalLinkIcon } from 'lucide-react'
import type { ListedDetection, RedditPostAndComments } from '@/api/models'
import { ExtractedProperties } from '@/components/ExtractedProperties'
import { RelevancyBadge } from '@/components/RelevancyBadge'
import { DetectionReaction } from '@/components/DetectionReaction'
import { RedditDetectionDialog } from '@/components/RedditDetectionDialog'

interface RedditDetectionCardProps {
  listedDetection: ListedDetection
}

export function RedditDetectionCard({ listedDetection }: RedditDetectionCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const redditPost = listedDetection.source_post as RedditPostAndComments

  return (
    <>
      <Card className="w-full mb-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDialogOpen(true)}>
        <CardHeader className="pt-3 pb-2 px-4 relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>r/{redditPost.post.subreddit}</span>
              </div>
              <h2 className="text-xl font-semibold mt-1">{redditPost.post.title}</h2>
            </div>
            <div className="flex items-center gap-2 absolute top-2 right-2">
              <RelevancyBadge isRelevant={listedDetection.detection.is_relevant} />
              <div onClick={(e) => e.stopPropagation()}>
                <DetectionReaction
                  listedDetection={listedDetection}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4">
          {listedDetection.detection.properties && Object.keys(listedDetection.detection.properties).length > 0 && (
            <ExtractedProperties
              properties={listedDetection.detection.properties}
              className="mb-2"
            />
          )}
          
          <div className="text-sm line-clamp-2 text-muted-foreground">
            {redditPost.post.selftext}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between py-2 px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ArrowUpIcon className="h-4 w-4" />
              <span>{redditPost.post.score}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquareIcon className="h-4 w-4" />
              <span>{redditPost.post.num_comments} comments</span>
            </div>
            <a
              href={`https://reddit.com${redditPost.post.permalink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs underline hover:text-primary ml-2"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLinkIcon className="h-3 w-3" />
              Reddit
            </a>
          </div>
        </CardFooter>
      </Card>

      {listedDetection && (
        <RedditDetectionDialog 
          listedDetection={listedDetection}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  )
} 