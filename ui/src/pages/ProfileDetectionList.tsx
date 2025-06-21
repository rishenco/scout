import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ArrowLeft, Settings, Play, Pause } from 'lucide-react'
import { DetectionList } from '@/components/detections/DetectionList'
import { useProfile, useSubredditsForProfile, useUpdateProfile } from '@/api/hooks'

export default function ProfileDetectionList() {
  const { profileId } = useParams<{ profileId: string }>()
  const { data: profile } = useProfile(parseInt(profileId || '0'))
  const { data: subreddits } = useSubredditsForProfile(parseInt(profileId || '0'))
  const updateProfile = useUpdateProfile()

  const handleActiveToggle = () => {
    if (profile) {
      updateProfile.mutate({
        id: profile.id,
        update: { active: !profile.active }
      })
    }
  }

  if (!profileId) {
    return <div>Profile ID not found!</div>
  }

  return (
    <TooltipProvider>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">{profile?.name || 'Loading...'}</h1>
            {profile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleActiveToggle}
                    disabled={updateProfile.isPending}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:scale-105 disabled:opacity-50 ${
                      profile.active 
                        ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    {profile.active ? (
                      <Play className="h-5 w-5 fill-current" />
                    ) : (
                      <Pause className="h-5 w-5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {profile.active 
                      ? "Click to deactivate - stop automatic analysis of new posts" 
                      : "Click to activate - start automatic analysis of new posts"}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <Button asChild variant="outline">
            <Link to={`/profiles/${profileId}/edit`}>
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Link>
          </Button>
        </div>
        
        {profile && (
          <div className="mb-6">
            <p className="text-muted-foreground">
              Subreddits: {subreddits?.map(subreddit => subreddit.subreddit).join(', ')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {profile.active 
                ? "Profile is automatically analyzing new posts" 
                : "Profile is inactive - posts won't be analyzed automatically"}
            </p>
          </div>
        )}
        
        <DetectionList profileId={parseInt(profileId || '0')} />
      </div>
    </TooltipProvider>
  )
} 