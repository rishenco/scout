import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PromptInput } from "@/components/PromptInput";
import { X, Plus } from "lucide-react";

type PropertiesEditorProps = {
  properties: Record<string, string>;
  onChange: (properties: Record<string, string>) => void;
  className?: string;
};

export function PropertiesEditor({
  properties,
  onChange,
  className = "",
}: PropertiesEditorProps) {
  const [newPropertyName, setNewPropertyName] = useState("");

  const handleAddProperty = () => {
    if (!newPropertyName.trim()) return;
    
    // Don't add if property name already exists
    if (properties[newPropertyName]) return;
    
    onChange({
      ...properties,
      [newPropertyName]: "",
    });
    setNewPropertyName("");
  };

  const handleRemoveProperty = (name: string) => {
    const newProperties = { ...properties };
    delete newProperties[name];
    onChange(newProperties);
  };

  const handlePropertyPromptChange = (name: string, prompt: string) => {
    onChange({
      ...properties,
      [name]: prompt,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label htmlFor="properties">Properties to Extract</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Define properties to extract from posts and the prompts to use
        </p>
      </div>

      {Object.entries(properties).map(([name, prompt]) => (
        <div key={name} className="space-y-2 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">{name}</Label>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveProperty(name)}
              aria-label={`Remove property ${name}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <PromptInput
            label="Extraction Prompt"
            value={prompt}
            onChange={(value) => handlePropertyPromptChange(name, value)}
            placeholder={`How would you extract the "${name}" property from a post?`}
          />
        </div>
      ))}

      <div className="flex gap-2">
        <Input
          placeholder="New property name"
          value={newPropertyName}
          onChange={(e) => setNewPropertyName(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAddProperty} disabled={!newPropertyName.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
    </div>
  );
} 