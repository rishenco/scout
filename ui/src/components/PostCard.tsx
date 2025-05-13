import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpIcon, MessageSquareIcon, ExternalLinkIcon } from 'lucide-react'
import type { Detection, Post, UserClassification } from '@/api/models'
import { ExtractedProperties } from '@/components/ExtractedProperties'
import { RelevancyBadge } from '@/components/RelevancyBadge'
import { PostReaction } from '@/components/PostReaction'
import { PostDialog } from '@/components/PostDialog'

interface PostCardProps {
  detection?: Detection
  post?: Post
  userClassification?: UserClassification
  isLoading?: boolean
}

export function PostCard({ detection, post, userClassification, isLoading = false }: PostCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isLoading || !detection || !post) {
    return (
      <Card className="w-full mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <Skeleton className="h-6 w-[300px] mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[100px]" />
        </CardFooter>
      </Card>
    )
  }

  const { is_relevant, extracted_properties } = detection;

  return (
    <>
      <Card className="w-full mb-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDialogOpen(true)}>
        <CardHeader className="pt-3 pb-2 px-4 relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>r/{post.reddit.subreddit}</span>
              </div>
              <h2 className="text-xl font-semibold mt-1">{post.title}</h2>
            </div>
            <div className="flex items-center gap-2 absolute top-2 right-2">
              <RelevancyBadge isRelevant={is_relevant} />
              <div onClick={(e) => e.stopPropagation()}>
                <PostReaction
                  detection={detection}
                  userClassification={userClassification}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4">
          {extracted_properties && Object.keys(extracted_properties).length > 0 && (
            <ExtractedProperties
              properties={extracted_properties}
              className="mb-2"
            />
          )}
          
          <div className="text-sm line-clamp-2 text-muted-foreground">
            {post.content}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between py-2 px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ArrowUpIcon className="h-4 w-4" />
              <span>{post.reddit.score}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquareIcon className="h-4 w-4" />
              <span>{post.reddit.num_comments} comments</span>
            </div>
            <a
              href={`https://reddit.com${post.reddit.permalink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs underline hover:text-primary ml-2"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLinkIcon className="h-3 w-3" />
              Reddit
            </a>
          </div>
          
          <div></div>
        </CardFooter>
      </Card>

      {detection && post && (
        <PostDialog 
          detection={detection}
          post={post}
          userClassification={userClassification}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  )
} 