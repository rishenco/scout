import { useProfiles } from '@/api/hooks'
import { ProfileList } from '@/components/profiles/ProfileList'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'

export default function Home() {
  const { data: profiles = [], isLoading, error } = useProfiles()

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Scout</h1>
        <Button asChild>
          <Link to="/profiles/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Profile
          </Link>
        </Button>
      </div>
      
      <ProfileList profiles={profiles} isLoading={isLoading} error={error as Error | null} />
    </div>
  )
} 