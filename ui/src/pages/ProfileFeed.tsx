import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function ProfileFeed() {
  const { profileId } = useParams()

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="outline" size="icon">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Profile Feed</h1>
      </div>
      <p className="text-muted-foreground">Viewing feed for profile: {profileId}</p>
      <p className="mt-4">This page will be implemented later.</p>
    </div>
  )
} 