import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ProfileEditor } from '@/components/ProfileEditor'
import { PlaygroundPostList } from '@/components/playground/PlaygroundPostList'
import { 
  useProfile, 
  useUpdateProfile,
  useAddProfilesToSubreddit
} from '@/api/hooks'
import type { ProfileSettings, ProfileUpdate } from '@/api/models'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditProfile() {
  const { profileId } = useParams<{ profileId: string }>()
  const numberProfileId = parseInt(profileId || '0')
  
  const { data: profile, isLoading: isLoadingProfile } = useProfile(numberProfileId)
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile()
  const {mutate: addProfilesToSubreddit, isPending: isAddingProfilesToSubreddit} = useAddProfilesToSubreddit()

  const handleUpdateProfile = (update: ProfileUpdate, subreddits: string[]) => {
    if (!profileId) return

    // Store draft profile for testing
    updateProfile(
      {id: numberProfileId, update: update},
      {
        onError: (err) => {
          console.log(`Failed to update profile ${err.message}`)
        },
      }
    )

    for (const subreddit of subreddits) {
      addProfilesToSubreddit({
        subreddit,
        profileIds: [numberProfileId],
      })
    }
  }

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
              onSubmit={handleUpdateProfile} 
              isSubmitting={isUpdatingProfile || isAddingProfilesToSubreddit}
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
          {profileId ? (
            <PlaygroundPostList
              profileId={profileId}
              profileSettings={profile?.default_settings as ProfileSettings}
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