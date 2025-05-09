import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type PromptInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  description?: string;
  required?: boolean;
};

export function PromptInput({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  description,
  required,
}: PromptInputProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={label.toLowerCase().replace(/\s/g, "-")}>{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <Textarea
        id={label.toLowerCase().replace(/\s/g, "-")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-32"
        required={required}
      />
    </div>
  );
} 