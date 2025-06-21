import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/api/models'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Play, Pause } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSubredditsForProfile } from '@/api/hooks'

interface ProfileCardProps {
  profile: Profile
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const { data: subreddits } = useSubredditsForProfile(profile.id)

  const navigate = useNavigate()

  const handleCardClick = () => {
    navigate(`/profiles/${profile.id}`)
  }

  return (
    <TooltipProvider>
      <div onClick={handleCardClick} className="block h-full cursor-pointer">
        <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{profile.name}</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    profile.active 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {profile.active ? (
                      <Play className="h-4 w-4 fill-current" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{profile.active ? 'Active - Automatically analyzing new posts' : 'Inactive - Manual analysis only'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="flex flex-wrap gap-2">
              {subreddits?.map((subreddit) => (
                <a
                  key={subreddit.subreddit}
                  href={`https://www.reddit.com/r/${subreddit.subreddit}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-accent text-accent-foreground rounded px-2 py-1 text-sm hover:bg-accent/80"
                >
                  r/{subreddit.subreddit}
                </a>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button asChild variant="outline" onClick={(e) => e.stopPropagation()}>
              <Link to={`/profiles/${profile.id}/edit`}>Edit</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  )
} 