import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ProfileEditor } from '@/components/ProfileEditor'
import { TestPostList } from '@/components/TestPostList'
import { 
  useProfile, 
  useUpdateProfile, 
  useUserClassifications,
  useAnalyzePosts
} from '@/api/hooks'
import type { ProfileSettings, Profile, AnalyzePostsResponse, DetectionWithPost, Post } from '@/api/models'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditProfile() {
  const { profileId } = useParams<{ profileId: string }>()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [draftProfile, setDraftProfile] = useState<ProfileSettings | null>(null)
  const [analysisResults, setAnalysisResults] = useState<Record<string, DetectionWithPost>>({})
  
  const { data: profile, isLoading: isLoadingProfile } = useProfile(profileId || '')
  const { data: userClassifications = [], isLoading: isLoadingClassifications } = useUserClassifications({
    profile_id: profileId,
  })
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile()
  const { mutate: analyzePosts, isPending: isAnalyzing } = useAnalyzePosts()

  const handleUpdateProfile = (profileData: ProfileSettings) => {
    if (!profileId) return
    
    setError(null)
    setSuccessMessage(null)
    // Store draft profile for testing
    setDraftProfile(profileData)
    updateProfile(
      { id: profileId, settings: profileData },
      {
        onSuccess: () => {
          setSuccessMessage('Profile updated successfully')
        },
        onError: (err) => {
          setError(`Failed to update profile: ${err.message}`)
        },
      }
    )
  }

  const handleAnalyzePosts = (postIds: string[]) => {
    if (!profileId || !postIds.length) return

    const profileToTest = draftProfile || profile

    if (!profileToTest) return

    analyzePosts(
      {
        profile: profileToTest,
        post_ids: postIds
      },
      {
        onSuccess: (response: AnalyzePostsResponse) => {
          setAnalysisResults(response.detections.reduce((acc, detection) => {
            acc[detection.post_id] = {
              ...detection,
              post: posts.find(p => p.id === detection.post_id) as Post
            }
            return acc
          }, {} as Record<string, DetectionWithPost>))
        },
        onError: (err) => {
          setError(`Failed to analyze posts: ${err.message}`)
        }
      }
    )
  }

  const isLoading = isLoadingProfile || isLoadingClassifications

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
      
      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 p-4 rounded-md mb-6">
          {successMessage}
        </div>
      )}

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
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : profileId ? (
            <TestPostList
              profileId={profileId}
              userClassifications={userClassifications}
              analysisResults={analysisResults}
              isAnalyzing={isAnalyzing}
              onAnalyze={handleAnalyzePosts}
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