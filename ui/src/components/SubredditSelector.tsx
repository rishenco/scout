import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

type SubredditSelectorProps = {
  subreddits: string[];
  onChange: (subreddits: string[]) => void;
  className?: string;
};

export function SubredditSelector({
  subreddits,
  onChange,
  className = "",
}: SubredditSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addSubreddit = (subreddit: string) => {
    const trimmed = subreddit.trim().toLowerCase();
    
    if (!trimmed) return;
    if (subreddits.includes(trimmed)) return;
    
    onChange([...subreddits, trimmed]);
  };

  const removeSubreddit = (index: number) => {
    const newSubreddits = [...subreddits];
    newSubreddits.splice(index, 1);
    onChange(newSubreddits);
  };

  const extractSubredditFromRedditUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      
      // Check if the URL is from reddit.com
      if (!urlObj.hostname.includes('reddit.com') && !urlObj.hostname.includes('redd.it')) {
        return null;
      }
      
      // Extract subreddit from pathname
      const pathParts = urlObj.pathname.split('/');
      for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === 'r' && i + 1 < pathParts.length && pathParts[i + 1]) {
          return pathParts[i + 1].toLowerCase();
        }
      }
      
      return null;
    } catch (e) {
      // If URL parsing fails, it's not a valid URL
      return null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // If user types a space, try to add the subreddit
    if (value.endsWith(" ")) {
      const subreddit = value.trim();
      if (subreddit) {
        addSubreddit(subreddit);
        setInputValue("");
        return;
      }
    }
    
    setInputValue(value);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Try to extract subreddit from Reddit URL
    const extractedSubreddit = extractSubredditFromRedditUrl(pastedText);
    
    if (extractedSubreddit) {
      e.preventDefault();
      addSubreddit(extractedSubreddit);
    }
    // If not a Reddit URL, let the default paste behavior continue
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Add subreddit on Enter
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addSubreddit(inputValue);
        setInputValue("");
      }
    }
    
    // Remove last subreddit on Backspace if input is empty
    if (e.key === "Backspace" && !inputValue && subreddits.length > 0) {
      removeSubreddit(subreddits.length - 1);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="subreddits">Subreddits</Label>
      <p className="text-sm text-muted-foreground">
        Type a subreddit name and press space or enter to add it. You can also paste Reddit links.
      </p>
      
      <div 
        className="flex flex-wrap gap-2 p-2 border rounded-md cursor-text min-h-10"
        onClick={focusInput}
      >
        {subreddits.map((subreddit, index) => (
          <div 
            key={index} 
            className="flex items-center bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-sm"
          >
            r/{subreddit}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 p-0"
              onClick={(e) => {
                e.stopPropagation();
                removeSubreddit(index);
              }}
              aria-label={`Remove ${subreddit}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        
        <Input
          ref={inputRef}
          type="text"
          id="subreddits"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="flex-1 min-w-20 border-none shadow-none focus-visible:ring-0 p-0 h-7"
          placeholder={subreddits.length === 0 ? "e.g. programming, webdev" : ""}
        />
      </div>
    </div>
  );
} 