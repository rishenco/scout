import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/api/models'
import { Button } from '@/components/ui/button'
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
    <div onClick={handleCardClick} className="block h-full cursor-pointer">
      <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle>{profile.name}</CardTitle>
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
  )
} 