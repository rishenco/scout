import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ProfileEditor } from '@/components/profiles/ProfileEditor'
import { PlaygroundPostList } from '@/components/profiles/playground/PlaygroundPostList'
import { toast } from "sonner";
import { 
  useProfile, 
  useCombinedUpdateProfile,
} from '@/api/hooks'
import type { ProfileUpdate } from '@/api/models'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useCallback } from 'react'

export default function EditProfile() {
  const { profileId } = useParams<{ profileId: string }>()
  const numberProfileId = parseInt(profileId || '-1')
  
  const { data: profile, isLoading: isLoadingProfile } = useProfile(numberProfileId)
  const { mutate: combinedUpdateProfile, isPending: isUpdatingProfile } = useCombinedUpdateProfile()


  const [draftUpdateData, setDraftUpdateData] = useState<ProfileUpdate | null>(null)

  const handleEditProfile = useCallback((update: ProfileUpdate, _: string[]) => {
    setDraftUpdateData(update)
  }, [])

  const handleSaveProfile = useCallback((update: ProfileUpdate, subreddits: string[]) => {
    if (numberProfileId == 0) return

    // Store draft profile for testing
    combinedUpdateProfile(
      {id: numberProfileId, update: update, newSubreddits: subreddits},
      {
        onSuccess: () => {
          toast.success("Profile updated successfully!");
        },
        onError: (err: Error) => {
          toast.error(`Failed to update profile: ${err.message}`)
        },
      }
    )
  }, [numberProfileId, combinedUpdateProfile])

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="outline" size="icon">
          <Link to={`/profiles/${profileId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
          {isLoadingProfile ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : profile ? (
            <ProfileEditor 
              initialProfile={profile}
              onEdit={handleEditProfile}
              onSubmit={handleSaveProfile}
              isSubmitting={isUpdatingProfile}
            />
          ) : (
            <div className="p-4 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 rounded-md">
              Profile not found.
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="mb-4 text-sm text-muted-foreground">
            Update profile settings and test them against previously labeled posts to see how the changes affect relevancy detection.
          </div>
          {profileId && profile?.default_settings ? (
            <PlaygroundPostList
              profileId={profileId}
              profileSettings={draftUpdateData?.default_settings || profile.default_settings}
            />
          ) : (
            <div className="p-4 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 rounded-md">
              Profile not found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 