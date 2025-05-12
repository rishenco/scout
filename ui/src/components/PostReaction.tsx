import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DetectionWithPost, NewUserClassification } from '@/api/models'
import { useCreateUserClassification, useUpdateUserClassification, useDeleteUserClassification } from '@/api/hooks'

interface PostReactionProps {
  detection: DetectionWithPost
  onReactionComplete?: (isRelevant: boolean | undefined) => void
}

export function PostReaction({ detection, onReactionComplete }: PostReactionProps) {
  // Get the existing user classification if any
  const existingClassification = detection.user_classification
  const [isRelevant, setIsRelevant] = useState<boolean | undefined>(
    existingClassification?.is_relevant
  )

  // Use mutations for creating, updating or deleting
  const createMutation = useCreateUserClassification()
  const updateMutation = useUpdateUserClassification()
  const deleteMutation = useDeleteUserClassification()

  // Handle user reaction
  const handleReaction = (relevant: boolean) => {
    // If the user clicks the same button again, toggle it off
    if (isRelevant === relevant) {
      setIsRelevant(undefined)
      // Remove existing classification if any
      if (existingClassification) {
        deleteMutation.mutate({
          profileId: detection.profile_id,
          postId: detection.post_id
        })
        
        // Callback with undefined to indicate classification was removed
        if (onReactionComplete) {
          onReactionComplete(undefined)
        }
      }
      return
    }

    // Set new value
    setIsRelevant(relevant)

    // Prepare classification data
    const classificationData: NewUserClassification = {
      profile_id: detection.profile_id,
      post_id: detection.post_id,
      is_relevant: relevant
    }

    // Create or update classification
    if (existingClassification) {
      updateMutation.mutate({
        profileId: detection.profile_id,
        postId: detection.post_id,
        data: classificationData
      })
    } else {
      createMutation.mutate(classificationData)
    }

    // Callback if provided
    if (onReactionComplete) {
      onReactionComplete(relevant)
    }
  }

  // Check if an operation is in progress
  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

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