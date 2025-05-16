import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ListedDetection, DetectionTagUpdateRequest } from '@/api/models'
import { useUpdateDetectionTags } from '@/api/hooks'

interface PostReactionProps {
  detection: ListedDetection
}

export function PostReaction({ detection }: PostReactionProps) {
  // will be updated with cache, no need to update manually
  const isRelevant = detection.tags?.relevancy_detected_correctly === null ? undefined : detection.tags?.relevancy_detected_correctly

  const { mutate: updateDetectionTags, isPending: isLoading } = useUpdateDetectionTags()

  const handleReaction = (relevant: boolean) => {
    const currentReactionIsSame = isRelevant === relevant;

    updateDetectionTags(
      {
        detectionId: detection.detection.id,
        tags: {
          relevancy_detected_correctly: currentReactionIsSame ? null : relevant,
        },
      }
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isRelevant === true ? "default" : "outline"}
        size="sm"
        onClick={() => !isLoading && handleReaction(true)}
        disabled={isLoading}
        className="p-2 h-8"
        aria-label="Mark as relevant"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isRelevant === false ? "default" : "outline"}
        size="sm"
        onClick={() => !isLoading && handleReaction(false)}
        disabled={isLoading}
        className="p-2 h-8"
        aria-label="Mark as not relevant"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  )
} 