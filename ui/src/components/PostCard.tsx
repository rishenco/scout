import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpIcon, MessageSquareIcon, ExternalLinkIcon } from 'lucide-react'
import { type DetectionWithPost } from '@/api/models'
import { ExtractedProperties } from '@/components/ExtractedProperties'
import { Badge } from '@/components/ui/badge'
import { PostReaction } from '@/components/PostReaction'
import { PostDialog } from '@/components/PostDialog'
import { Button } from '@/components/ui/button'

interface PostCardProps {
  detection?: DetectionWithPost
  isLoading?: boolean
}

export function PostCard({ detection, isLoading = false }: PostCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isLoading || !detection) {
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

  const { post, is_relevant, extracted_properties } = detection

  return (
    <>
      <Card className="w-full mb-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDialogOpen(true)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>r/{post.reddit.subreddit}</span>
            <Badge variant={is_relevant ? "default" : "secondary"} className="text-xs">
              {is_relevant ? 'Relevant' : 'Not Relevant'}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold mt-1">{post.title}</h2>
        </CardHeader>
        <CardContent className="pb-2 space-y-2">
          {extracted_properties && Object.keys(extracted_properties).length > 0 && (
            <ExtractedProperties properties={extracted_properties} />
          )}
          
          <div className="text-sm line-clamp-2 text-muted-foreground">
            {post.content}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ArrowUpIcon className="h-4 w-4" />
              <span>{post.reddit.score}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquareIcon className="h-4 w-4" />
              <span>{post.reddit.num_comments} comments</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-0 h-auto"
              onClick={(e) => {
                e.stopPropagation();
                setDialogOpen(true);
              }}
            >
              View Full Post
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div onClick={(e) => e.stopPropagation()}>
              <PostReaction 
                detection={detection}
              />
            </div>
            
            <a 
              href={`https://reddit.com${post.reddit.permalink}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs underline hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLinkIcon className="h-3 w-3" />
              Reddit
            </a>
          </div>
        </CardFooter>
      </Card>

      {detection && (
        <PostDialog 
          detection={detection}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  )
} 