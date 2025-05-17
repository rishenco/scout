import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings } from 'lucide-react'
import { DetectionList } from '@/components/DetectionList'
import { useProfile, useSubredditsForProfile } from '@/api/hooks'

export default function ProfileDetectionList() {
  const { profileId } = useParams<{ profileId: string }>()
  const { data: profile } = useProfile(parseInt(profileId || '0'))
  const { data: subreddits } = useSubredditsForProfile(parseInt(profileId || '0'))

  if (!profileId) {
    return <div>Profile ID not found!</div>
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{profile?.name || 'Loading...'}</h1>
        </div>
        <Button asChild variant="outline">
          <Link to={`/profiles/${profileId}/edit`}>
            <Settings className="h-4 w-4 mr-2" />
            Edit Profile
          </Link>
        </Button>
      </div>
      
      {profile && (
        <div className="mb-4">
          <p className="text-muted-foreground">Subreddits: {subreddits?.map(subreddit => subreddit.subreddit).join(', ')}</p>
        </div>
      )}
      
      <DetectionList profileId={parseInt(profileId || '0')} />
    </div>
  )
} 