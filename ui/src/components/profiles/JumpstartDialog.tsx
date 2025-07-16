import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DiscreteSlider } from "@/components/ui/discrete-slider";
import { useJumpstartProfile, useDryJumpstartCount } from "@/api/hooks";
import type { ProfileJumpstartRequest } from "@/api/models";
import { toast } from "sonner";

interface JumpstartDialogProps {
  profileId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  showAfterProfileChange?: boolean;
  onSkipAndActivate?: () => void;
}

const TIME_PERIODS = [
  { value: 1, label: "1d" },
  { value: 2, label: "2d" },
  { value: 3, label: "3d" },
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
];

const LIMIT_OPTIONS = [
  { value: 10, label: "10" },
  { value: 30, label: "30" },
  { value: 50, label: "50" },
  { value: 150, label: "150" },
  { value: 500, label: "500" },
];

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
  const [selectedLimit, setSelectedLimit] = useState(50);

  const { mutate: jumpstartProfile, isPending: isSubmitting } = useJumpstartProfile();
  const { mutate: checkTaskCount, data: taskCount, isPending: isCheckingCount } = useDryJumpstartCount();

  const request: ProfileJumpstartRequest = {
    exclude_already_analyzed: excludeAlreadyAnalyzed,
    jumpstart_period: jumpstartPeriod,
    limit: selectedLimit,
  };

  useEffect(() => {
    if (!open || !profileId) return;

    checkTaskCount({ 
      id: profileId, 
      request: { ...request, limit: 1000 }
    });
  }, [open, profileId, excludeAlreadyAnalyzed, jumpstartPeriod, checkTaskCount]);

  const availableLimitOptions = useMemo(() => {
    const availableTasks = taskCount || 0;
    
    if (availableTasks === 0) {
      return LIMIT_OPTIONS;
    }
    
    const filtered = LIMIT_OPTIONS.filter(option => option.value <= availableTasks);
    if (taskCount && !filtered.some(opt => opt.value === taskCount)) {
      filtered.push({ value: taskCount, label: taskCount.toString() });
      filtered.sort((a, b) => a.value - b.value);
    }
    return filtered;
  }, [taskCount]);

  useEffect(() => {
    if (taskCount !== undefined && availableLimitOptions.length > 0) {
      const availableTasks = taskCount;
      
      if (selectedLimit > availableTasks && availableTasks > 0) {
        const validOption = availableLimitOptions
          .filter(option => option.value <= availableTasks)
          .pop();
        
        if (validOption && validOption.value !== selectedLimit) {
          setSelectedLimit(validOption.value);
        }
      }
    }
  }, [taskCount, availableLimitOptions, selectedLimit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const availableTasks = taskCount || 0;
    const finalLimit = Math.min(selectedLimit, availableTasks);
    
    jumpstartProfile(
      { id: profileId, request: { ...request, limit: finalLimit } },
      {
        onSuccess: () => {
          toast.success(`Jumpstart scheduled! ${finalLimit} posts will be analyzed.`);
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (err: Error) => {
          toast.error(`Jumpstart failed: ${err.message}`);
        },
      }
    );
  };

  const availableTasks = taskCount || 0;
  const effectiveLimit = Math.min(selectedLimit, availableTasks);
  const isSubmitDisabled = isSubmitting || isCheckingCount || availableTasks === 0;

  const getStatusText = () => {
    if (isCheckingCount) return "Checking available posts...";
    if (availableTasks === 0) return "No posts available with current settings";
    return `${availableTasks} posts available`;
  };

  const getStatusVariant = () => {
    if (isCheckingCount) return "default";
    if (availableTasks === 0) return "destructive";
    if (effectiveLimit < selectedLimit) return "secondary";
    return "default";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Jumpstart Profile</DialogTitle>
          <DialogDescription>
            Analyze recent posts from your selected subreddits to quickly test your profile settings.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclude-analyzed"
              checked={excludeAlreadyAnalyzed}
              onCheckedChange={(checked) => setExcludeAlreadyAnalyzed(checked as boolean)}
            />
            <Label htmlFor="exclude-analyzed" className="text-sm font-normal">
              Skip posts that have already been analyzed
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Time Period</Label>
            <DiscreteSlider
              options={TIME_PERIODS}
              value={jumpstartPeriod}
              onValueChange={setJumpstartPeriod}
            />
            <p className="text-xs text-muted-foreground">
              How far back to look for posts
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Maximum Posts</Label>
            <DiscreteSlider
              options={availableLimitOptions}
              value={selectedLimit}
              onValueChange={setSelectedLimit}
              disabled={isCheckingCount || availableTasks === 0}
            />
            <p className="text-xs text-muted-foreground">
              Number of posts to analyze
            </p>
          </div>

          <div className="rounded-md border bg-muted/50 p-3">
            <p className="text-sm font-medium">{getStatusText()}</p>
            {availableTasks === 0 && !isCheckingCount && (
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting the time period or unchecking "Skip analyzed posts"
              </p>
            )}
            {effectiveLimit < selectedLimit && availableTasks > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Limited to {effectiveLimit} posts based on availability
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
              >
                Skip & Activate
              </Button>
            )}
            <Button type="submit" disabled={isSubmitDisabled}>
              {isSubmitting ? "Starting..." : `Start Jumpstart (${effectiveLimit})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}