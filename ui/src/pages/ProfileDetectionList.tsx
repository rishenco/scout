import { useParams, Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ArrowLeft, Settings, Play, Pause, Zap } from 'lucide-react'
import { DetectionList } from '@/components/detections/DetectionList'
import { JumpstartDialog } from '@/components/profiles/JumpstartDialog'
import { useProfile, useSubredditsForProfile, useUpdateProfile } from '@/api/hooks'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function ProfileDetectionList() {
  const { profileId } = useParams<{ profileId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: profile } = useProfile(parseInt(profileId || '0'))
  const { data: subreddits } = useSubredditsForProfile(parseInt(profileId || '0'))
  const updateProfileMutation = useUpdateProfile()
  const [showJumpstartDialog, setShowJumpstartDialog] = useState(false)
  const [isFromProfileChange, setIsFromProfileChange] = useState(false)

  // Check for jumpstart parameter and show dialog
  useEffect(() => {
    if (searchParams.get('jumpstart') === 'true') {
      setShowJumpstartDialog(true)
      setIsFromProfileChange(true)
      // Remove the parameter from URL to clean it up
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete('jumpstart')
      setSearchParams(newSearchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleActiveToggle = () => {
    if (profile) {
      updateProfileMutation.mutate({
        id: profile.id,
        update: { active: !profile.active }
      })
    }
  }

  const handleSkipAndActivate = () => {
    if (profile) {
      updateProfileMutation.mutate(
        {
          id: profile.id,
          update: { active: true }
        },
        {
          onSuccess: () => {
            toast.success("Profile activated!");
          },
          onError: (err: Error) => {
            toast.error(`Failed to activate profile: ${err.message}`);
          },
        }
      );
    }
  };

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
                    disabled={updateProfileMutation.isPending}
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
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowJumpstartDialog(true)}
            >
              <Zap className="h-4 w-4 mr-2" />
              Jumpstart
            </Button>
            <Button asChild variant="outline">
              <Link to={`/profiles/${profileId}/edit`}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          </div>
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

        {profileId && (
          <JumpstartDialog
            profileId={parseInt(profileId)}
            open={showJumpstartDialog}
            onOpenChange={(open) => {
              setShowJumpstartDialog(open);
              if (!open) {
                setIsFromProfileChange(false);
              }
            }}
            showAfterProfileChange={isFromProfileChange}
            onSkipAndActivate={isFromProfileChange ? handleSkipAndActivate : undefined}
          />
        )}
      </div>
    </TooltipProvider>
  )
} 