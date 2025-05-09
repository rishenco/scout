import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PromptInput } from "@/components/PromptInput";
import { PropertiesEditor } from "@/components/PropertiesEditor";
import { SubredditSelector } from "@/components/SubredditSelector";
import type { ProfileSettings, Profile } from "@/api/models";

type ProfileEditorProps = {
  initialProfile?: Partial<Profile>;
  onSubmit: (profile: ProfileSettings) => void;
  isSubmitting?: boolean;
  className?: string;
};

export function ProfileEditor({
  initialProfile = {},
  onSubmit,
  isSubmitting = false,
  className = "",
}: ProfileEditorProps) {
  const [name, setName] = useState(initialProfile.name || "");
  const [subreddits, setSubreddits] = useState<string[]>(
    initialProfile.subreddits || []
  );
  const [relevancyFilterPrompt, setRelevancyFilterPrompt] = useState(
    initialProfile.relevancy_filter_prompt || ""
  );
  const [propertiesPrompts, setPropertiesPrompts] = useState<Record<string, string>>(
    initialProfile.properties_prompts || {}
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const profileData: ProfileSettings = {
      name,
      subreddits,
      relevancy_filter_prompt: relevancyFilterPrompt,
      properties_prompts: propertiesPrompts,
    };
    
    onSubmit(profileData);
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
        value={relevancyFilterPrompt}
        onChange={setRelevancyFilterPrompt}
        placeholder="Describe the criteria for considering a post relevant"
        description="This prompt will be used to determine if a post is relevant to your interests"
        required={true}
      />

      <PropertiesEditor
        properties={propertiesPrompts}
        onChange={setPropertiesPrompts}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : initialProfile.id ? "Update Profile" : "Create Profile"}
      </Button>
    </form>
  );
} 