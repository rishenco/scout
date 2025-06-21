import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProfileEditor } from '@/components/profiles/ProfileEditor';
import { toast } from "sonner";
import { 
  useCombinedCreateProfile, 
} from '@/api/hooks';
import type { Profile, ProfileUpdate } from '@/api/models';

export default function NewProfile() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { mutate: combinedCreateProfile, isPending } = useCombinedCreateProfile();

  const handleCreateProfile = (update: ProfileUpdate, subreddits: string[]) => {
    const profile: Profile = {
      id: 0,
      active: false,
      name: update.name || "New Profile",
    }

    if (update.default_settings) {
      const extractedProperties: Record<string, string> = {}

      for (const [key, value] of Object.entries(update.default_settings.extracted_properties || {})) {
        if (value !== null) {
          extractedProperties[key] = value;
        }
      }

      profile.default_settings = {
        relevancy_filter: update.default_settings.relevancy_filter || "",
        extracted_properties: extractedProperties,
      };
    }

    setError(null);

    combinedCreateProfile({profile, subreddits}, {
      onSuccess: (id: number) => {
        toast.success("Profile created successfully!");
        navigate(`/profiles/${id}`);
      },
      onError: (err: Error) => {
        toast.error(`Failed to create profile: ${err.message}`);
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