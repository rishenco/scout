import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useJumpstartProfile } from "@/api/hooks";
import type { ProfileJumpstartRequest } from "@/api/models";
import { toast } from "sonner";

interface JumpstartDialogProps {
  profileId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  showAfterProfileChange?: boolean; // true when shown after create/edit
  onSkipAndActivate?: () => void;
}

export function JumpstartDialog({
  profileId,
  open,
  onOpenChange,
  onSuccess,
  showAfterProfileChange = false,
  onSkipAndActivate,
}: JumpstartDialogProps) {
  const [excludeAlreadyAnalyzed, setExcludeAlreadyAnalyzed] = useState(false);
  const [jumpstartPeriod, setJumpstartPeriod] = useState(7);
  const [limit, setLimit] = useState(50);

  const { mutate: jumpstartProfile, isPending } = useJumpstartProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const request: ProfileJumpstartRequest = {
      exclude_already_analyzed: excludeAlreadyAnalyzed,
      jumpstart_period: jumpstartPeriod,
      limit: limit,
    };

    jumpstartProfile(
      { id: profileId, request },
      {
        onSuccess: () => {
          toast.success("Jumpstart scheduled!");
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (err: Error) => {
          toast.error(`Jumpstart failed: ${err.message}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Jumpstart Profile</DialogTitle>
          <DialogDescription>
            Analyze recent posts from your selected subreddits to quickly test your profile settings.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-analyzed"
                checked={excludeAlreadyAnalyzed}
                onCheckedChange={(checked) => setExcludeAlreadyAnalyzed(checked as boolean)}
              />
              <Label htmlFor="exclude-analyzed" className="text-sm">
                Skip posts that have already been analyzed
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Time Period (days)</Label>
              <Input
                id="period"
                type="number"
                min="1"
                max="30"
                value={jumpstartPeriod}
                onChange={(e) => setJumpstartPeriod(parseInt(e.target.value) || 7)}
                placeholder="7"
              />
              <p className="text-xs text-muted-foreground">
                How many days back to look for posts (1-30 days)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Maximum Posts</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="200"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of posts to analyze (1-200 posts)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {showAfterProfileChange ? "Skip" : "Cancel"}
            </Button>
            {showAfterProfileChange && onSkipAndActivate && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onSkipAndActivate();
                  onOpenChange(false);
                }}
                disabled={isPending}
              >
                Skip & Activate
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Analyzing..." : "Start Jumpstart"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 