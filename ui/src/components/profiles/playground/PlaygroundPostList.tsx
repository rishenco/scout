import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaygroundStats } from "@/components/profiles/playground/PlaygroundStats";
import type { AnalyzeRequest, ProfileSettingsUpdate, ListedDetection } from "@/api/models";
import { useAnalyzePost, useInfiniteDetections } from "@/api/hooks";
import { Loader2 } from "lucide-react";
import {type BenchmarkStats, isPostCorrect, type PlaygroundPost} from "@/components/profiles/playground/models";
import { DataTable } from "./data-table";
import { columns as createColumns } from "./columns";
import type { RowSelectionState } from "@tanstack/react-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DetectionDialog } from "@/components/detections/DetectionDialog";
import { toast } from "sonner";

interface PlaygroundPostListProps {
  profileId: string;
  profileSettings: ProfileSettingsUpdate;
}

type CorrectnessFilter = 'all' | 'correct' | 'incorrect';

export function PlaygroundPostList({
  profileId,
  profileSettings
}: PlaygroundPostListProps) {
  const [playgroundPosts, setPlaygroundPosts] = useState<PlaygroundPost[]>([]);
  const [correctnessFilter, setCorrectnessFilter] = useState<CorrectnessFilter>('all');
  const [stats, setStats] = useState<BenchmarkStats>({ total: 0, analyzed: 0, correct: 0, wrong: 0 });
  const [postsBeingAnalyzed, setPostsBeingAnalyzed] = useState<string[]>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [postsToShowCount, setPostsToShowCount] = useState<string>("10");
  const [selectedDetection, setSelectedDetection] = useState<ListedDetection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const profileIdNumber = parseInt(profileId, 10);

  const {
    data: feed,
    isLoading: isLoadingFeed,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteDetections({
    profiles: [profileIdNumber],
    tags: {
      relevancy_detected_correctly: [true, false]
    }
  });

  const { mutateAsync: analyzePostMutateAsync } = useAnalyzePost();

  const isAnalyzingPost = (postId: string) => postsBeingAnalyzed.includes(postId);

  const handleAnalyzePost = async (postId: string) => {
    // Find the post to analyze
    const postToAnalyze = playgroundPosts.find(p =>
      p.originalPost.detection &&
      p.originalPost.detection.source_id === postId
    )?.originalPost;

    if (!postToAnalyze || postsBeingAnalyzed.includes(postId)) {
      return;
    }

    // Create analyze request with the new API format
    const request: AnalyzeRequest = {
      source: postToAnalyze.detection?.source || 'unknown',
      source_id: postId,
      relevancy_filter: profileSettings.relevancy_filter,
      extracted_properties: profileSettings.extracted_properties,
    };

    setPostsBeingAnalyzed(prev => [...prev, postId]);

    try {
      const newDetection = await analyzePostMutateAsync(request);
      if (Math.random() < 0.1) {
        throw new Error("failed: failed: failed: ROMA LOX");
      }

      setPlaygroundPosts(prevPosts =>
        prevPosts.map(p =>
          p.originalPost.detection && p.originalPost.detection.source_id === postId
            ? { ...p, newDetection }
            : p
        )
      );
    } catch (error) {
      console.error("Failed to analyze post:", error);
      toast.error(`Failed to analyze post: ${error}`, {
        action: {
          label: "Retry",
          onClick: () => handleAnalyzePost(postId),
        },
      });
    } finally {
      setPostsBeingAnalyzed(prev => prev.filter(id => id !== postId));
    }
  };

  const handleRowClick = (post: PlaygroundPost) => {
    setSelectedDetection(post.originalPost);
    setIsDialogOpen(true);
  };

  // update selected detection when data changes (because of like updates)
  useEffect(() => {
    if (!selectedDetection || !feed) {
      return
    }
    const detection = feed.pages.flatMap(page => page).find(d => d.detection?.id === selectedDetection.detection.id)
    if (detection) {
      setSelectedDetection(detection)
    }
  }, [feed, selectedDetection])

  useEffect(() => {
    if (feed) {
      const allFeedPosts = feed.pages.flatMap(page => page);

      setPlaygroundPosts(prevPlaygroundPosts => {
        // Create a Set of existing post IDs for quick lookup
        const existingPostIds = new Set(
          prevPlaygroundPosts
            .filter(p => p.originalPost.detection)
            .map(p => p.originalPost.detection?.source_id)
        );

        // Map new posts from feed that we haven't seen before
        const newPostsFromFeed = allFeedPosts
          .filter(fp => fp.detection && !existingPostIds.has(fp.detection.source_id))
          .map(fp => ({
            originalPost: fp,
            newDetection: undefined
          }));

        // Update existing posts with fresh data
        const updatedPosts = prevPlaygroundPosts.map(pp => {
          // Find matching post by source_id
          const updatedFeedPost = pp.originalPost.detection &&
            allFeedPosts.find(fp =>
              fp.detection &&
              fp.detection.source_id === pp.originalPost.detection?.source_id
            );

          if (updatedFeedPost) {
            return {
              ...pp,
              originalPost: updatedFeedPost,
              // Keep the newDetection if it exists, otherwise use the detection from feed
              newDetection: pp.newDetection
            };
          }
          return pp;
        });

        return [...updatedPosts, ...newPostsFromFeed];
      });
    }
  }, [feed]);

  useEffect(() => {
    const newStats: BenchmarkStats = {
      total: playgroundPosts.length,
      analyzed: 0,
      correct: 0,
      wrong: 0,
    };

    playgroundPosts.forEach(p => {
      if (!p.originalPost.detection) return;

      const postId = p.originalPost.detection.source_id;

      if (postsBeingAnalyzed.includes(postId)) {
        return;
      }

      const isCorrect = isPostCorrect(p);

      if (isCorrect !== undefined) {
        newStats.analyzed++;
        if (isCorrect) {
          newStats.correct++;
        } else {
          newStats.wrong++;
        }
      }
    });

    setStats(newStats);
  }, [playgroundPosts, postsBeingAnalyzed]);

  let filteredAndSlicedPosts = playgroundPosts.filter(p => {
    if (correctnessFilter === 'all') {
      return true;
    }

    if (!p.originalPost.detection) return false;

    const detectionToConsider = p.newDetection ?? p.originalPost.detection;
    // Use tags.relevancy_detected_correctly to determine if user classified it differently
    const expected = p.originalPost.tags?.relevancy_detected_correctly !== undefined
      ? p.originalPost.detection.is_relevant === p.originalPost.tags.relevancy_detected_correctly
      : undefined;

    if (!detectionToConsider || expected === undefined) return false;

    const actual = detectionToConsider.is_relevant;
    const isCorrect = actual === expected;
    return correctnessFilter === 'correct' ? isCorrect : !isCorrect;
  });

  if (postsToShowCount !== 'all') {
    filteredAndSlicedPosts = filteredAndSlicedPosts.slice(0, parseInt(postsToShowCount));
  }

  const tableColumns = createColumns(handleAnalyzePost, isAnalyzingPost);

  const handleAnalyzeSelected = async () => {
    const selectedPostIndices = Object.keys(rowSelection).filter(index => rowSelection[parseInt(index)]);
    const postsToAnalyze = selectedPostIndices.map(index => filteredAndSlicedPosts[parseInt(index)]);
    if (postsToAnalyze.length === 0) return;

    await Promise.all(postsToAnalyze.map(post => {
      if (post.originalPost.detection) {
        return handleAnalyzePost(post.originalPost.detection.source_id);
      }
      return Promise.resolve();
    }));

    setRowSelection({});
  };

  const handleAnalyzeIncorrect = async () => {
    const incorrectPosts = playgroundPosts.filter(p => {
      if (!p.originalPost.detection) return false;

      const detection = p.newDetection ?? p.originalPost.detection;
      const expected = p.originalPost.tags?.relevancy_detected_correctly !== undefined
        ? p.originalPost.detection.is_relevant === p.originalPost.tags.relevancy_detected_correctly
        : undefined;

      return detection && expected !== undefined && detection.is_relevant !== expected;
    });

    if (incorrectPosts.length === 0) return;

    await Promise.all(incorrectPosts.map(post => {
      if (post.originalPost.detection) {
        return handleAnalyzePost(post.originalPost.detection.source_id);
      }
      return Promise.resolve();
    }));
  };

  const handleAnalyzeAll = async () => {
    if (playgroundPosts.length === 0) return;

    await Promise.all(playgroundPosts.map(post => {
      if (post.originalPost.detection) {
        return handleAnalyzePost(post.originalPost.detection.source_id);
      }
      return Promise.resolve();
    }));
  };

  const selectedCount = Object.keys(rowSelection).filter(k => rowSelection[k]).length;

  if (isLoadingFeed && !feed) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PlaygroundStats
        stats={stats}
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleAnalyzeSelected}
            disabled={selectedCount === 0 || postsBeingAnalyzed.length > 0}
          >
            Analyze Selected ({selectedCount})
          </Button>
          <Button
            onClick={handleAnalyzeIncorrect}
            disabled={stats.wrong === 0 || postsBeingAnalyzed.length > 0}
            variant="outline"
          >
            Analyze Incorrect ({stats.wrong})
          </Button>
          <Button
            onClick={handleAnalyzeAll}
            disabled={playgroundPosts.length === 0 || postsBeingAnalyzed.length > 0}
            variant="outline"
          >
            Analyze All ({playgroundPosts.length})
          </Button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="posts-to-show" className="text-sm font-medium">Show posts:</Label>
            <Select value={postsToShowCount} onValueChange={setPostsToShowCount}>
                <SelectTrigger id="posts-to-show" className="w-[80px] h-9">
                    <SelectValue placeholder="Count" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <Tabs value={correctnessFilter} onValueChange={(value) => setCorrectnessFilter(value as CorrectnessFilter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger
            value="correct"
            disabled={stats.correct === 0 && correctnessFilter !== 'correct'}
          >
            Correct ({stats.correct})
          </TabsTrigger>
          <TabsTrigger
            value="incorrect"
            disabled={stats.wrong === 0 && correctnessFilter !== 'incorrect'}
          >
            Incorrect ({stats.wrong})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      { isLoadingFeed && playgroundPosts.length === 0 ? (
         <div className="flex justify-center items-center h-full">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : filteredAndSlicedPosts.length === 0 && !isLoadingFeed ? (
        <Card className="p-6 text-center text-muted-foreground">
          {playgroundPosts.length === 0
            ? "No labeled posts found for this profile."
            : "No posts match the current filters or count selection."}
        </Card>
      ) : (
        <DataTable
          columns={tableColumns}
          data={filteredAndSlicedPosts}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onRowClick={handleRowClick}
        />
      )}

      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage || !hasNextPage}
            className="px-4 py-2 border rounded-md hover:bg-accent"
          >
            {isFetchingNextPage
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : hasNextPage
              ? 'Load More'
              : 'Nothing more to load'}
          </button>
        </div>
      )}

      {selectedDetection && (
        <DetectionDialog
          listedDetection={selectedDetection}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </div>
  );
}