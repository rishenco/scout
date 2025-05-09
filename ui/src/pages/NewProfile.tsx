import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProfileEditor } from '@/components/ProfileEditor';
import { useCreateProfile } from '@/api/hooks';
import type { ProfileSettings } from '@/api/models';

export default function NewProfile() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { mutate: createProfile, isPending } = useCreateProfile();

  const handleCreateProfile = (profileData: ProfileSettings) => {
    setError(null);
    createProfile(profileData, {
      onSuccess: (profile) => {
        navigate(`/profiles/${profile.id}`);
      },
      onError: (err) => {
        setError(`Failed to create profile: ${err.message}`);
      },
    });
  };

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="outline" size="icon">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create New Profile</h1>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="mx-auto max-w-2xl">
        <ProfileEditor 
          onSubmit={handleCreateProfile} 
          isSubmitting={isPending}
        />
      </div>
    </div>
  );
} 