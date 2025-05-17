import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PromptInput } from "@/components/PromptInput";
import { PropertiesEditor } from "@/components/PropertiesEditor";
import { SubredditSelector } from "@/components/SubredditSelector";
import type { ProfileSettings, Profile, ProfileUpdate } from "@/api/models";
import { useSubredditsForProfile } from "@/api/hooks";

type ProfileEditorProps = {
  initialProfile?: Partial<Profile>;
  onSubmit: (profile: ProfileUpdate, subreddits: string[]) => void;
  isSubmitting?: boolean;
  className?: string;
};

export function ProfileEditor({
  initialProfile = {},
  onSubmit,
  isSubmitting = false,
  className = "",
}: ProfileEditorProps) {
  const { data: loadedSubreddits } = useSubredditsForProfile(initialProfile?.id || -1)
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

    const profileUpdate: ProfileUpdate = {
      name: name,
      default_settings: {
        relevancy_filter: relevancyFilterPrompt,
        extracted_properties: propertiesPrompts,
      },
    };

    onSubmit(profileUpdate, subreddits);
  };

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

      <SubredditSelector 
        subreddits={subreddits}
        onChange={setSubreddits}
      />

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