import type { Profile } from '@/api/models'
import { ProfileCard } from '@/components/ProfileCard'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'

interface ProfileListProps {
  profiles: Profile[]
  isLoading: boolean
  error: Error | null
}

export function ProfileList({ profiles, isLoading, error }: ProfileListProps) {
  if (isLoading) {
    return <div className="text-center py-8">Loading profiles...</div>
  }

  profiles.sort((a, b) => a.name.localeCompare(b.name))

  if (error) {
    return <div className="text-center py-8 text-destructive">Error: {error.message}</div>
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-xl font-medium">No profiles yet</h2>
        <p className="text-muted-foreground">Create your first profile to get started</p>
        <Button asChild className="mt-4">
          <Link to="/profiles/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Profile
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}
      <div className="flex items-center justify-center border border-dashed rounded-lg p-8">
        <Button asChild variant="outline" className="w-full h-full flex flex-col items-center justify-center py-12">
          <Link to="/profiles/new">
            <PlusCircle className="h-12 w-12 mb-4" />
            <span>Create New Profile</span>
          </Link>
        </Button>
      </div>
    </div>
  )
} 