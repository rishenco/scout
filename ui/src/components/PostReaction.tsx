import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Detection, UserClassification as UserClassificationType } from '@/api/models'
import { useUpdateUserClassification } from '@/api/hooks'

interface PostReactionProps {
  detection: Detection
  userClassification?: UserClassificationType
}

export function PostReaction({ detection, userClassification }: PostReactionProps) {
  // will be updated with cache, no need to update manually
  const isRelevant = userClassification?.is_relevant === null ? undefined : userClassification?.is_relevant

  const { mutate: updateUserClassification, isPending: isLoading } = useUpdateUserClassification()

  const handleReaction = (relevant: boolean) => {
    const currentReactionIsSame = isRelevant === relevant;

    // Prepare classification data for API
    const newClassificationData: UserClassificationType = {
      profile_id: detection.profile_id,
      post_id: detection.post_id,
      is_relevant: currentReactionIsSame ? null : relevant,
    };

    updateUserClassification(newClassificationData);
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