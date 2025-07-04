import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PromptInput } from "@/components/profiles/PromptInput";
import { PropertiesEditor } from "@/components/profiles/PropertiesEditor";
import { SubredditSelector } from "@/components/profiles/SubredditSelector";
import type { Profile, ProfileUpdate } from "@/api/models";
import { useSubredditsForProfile } from "@/api/hooks";
import { Skeleton } from "../ui/skeleton";

type ProfileEditorProps = {
  initialProfile?: Partial<Profile>;
  onEdit?: (profile: ProfileUpdate, subreddits: string[]) => void;
  onSubmit: (profile: ProfileUpdate, subreddits: string[]) => void;
  isSubmitting?: boolean;
  className?: string;
};

export function ProfileEditor({
  initialProfile = {},
  onEdit,
  onSubmit,
  isSubmitting = false,
  className = "",
}: ProfileEditorProps) {
  const { data: loadedSubreddits, isLoading: isLoadingSubreddits } = useSubredditsForProfile(initialProfile?.id || -1)
  const [name, setName] = useState(initialProfile.name || "");
  const [subreddits, setSubreddits] = useState<string[]>(
    loadedSubreddits?.map((subreddit) => subreddit.subreddit) || [],
  );
  const [relevancyFilterPrompt, setRelevancyFilterPrompt] = useState(
    initialProfile.default_settings?.relevancy_filter || undefined
  );
  const [propertiesPrompts, setPropertiesPrompts] = useState<Record<string, string> | undefined>(
    initialProfile.default_settings?.extracted_properties || undefined
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      name: name,
      active: false,
      default_settings: {
        relevancy_filter: relevancyFilterPrompt || '',
        extracted_properties: propertiesPrompts || {},
      },
    }, subreddits);
  };

  useEffect(() => {
    const profileUpdate: ProfileUpdate = {
      name: name,
      active: false,
      default_settings: {
        relevancy_filter: relevancyFilterPrompt || '',
        extracted_properties: propertiesPrompts || {},
      },
    };
    if (onEdit) {
      onEdit(profileUpdate, subreddits);
    }
  }, [name, relevancyFilterPrompt, propertiesPrompts, subreddits, onEdit]);

  return (
    <form onSubmit={handleSubmit} className={`space-y-8 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="name">Profile Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Tech News, Programming Updates"
          required
        />
      </div>

      {isLoadingSubreddits ?
        <Skeleton className="h-40" /> :
        <SubredditSelector
          subreddits={subreddits}
          onChange={setSubreddits}
        />}

      <PromptInput
        label="Relevancy Filter Prompt"
        value={relevancyFilterPrompt || ""}
        onChange={setRelevancyFilterPrompt}
        placeholder="Describe the criteria for considering a post relevant"
        description="This prompt will be used to determine if a post is relevant to your interests"
        required={true}
      />

      <PropertiesEditor
        properties={propertiesPrompts || {}}
        onChange={setPropertiesPrompts}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : initialProfile.id ? "Update Profile" : "Create Profile"}
      </Button>
    </form>
  );
} 