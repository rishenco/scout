import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/api/models'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

interface ProfileCardProps {
  profile: Profile
}

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{profile.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex flex-wrap gap-2">
          {profile.subreddits.map((subreddit) => (
            <div key={subreddit} className="bg-muted text-muted-foreground rounded px-2 py-1 text-sm">
              r/{subreddit}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button asChild variant="default">
          <Link to={`/profiles/${profile.id}`}>View Feed</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/profiles/${profile.id}/edit`}>Edit</Link>
        </Button>
      </CardFooter>
    </Card>
  )
} 