import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaygroundStats } from "@/components/playground/PlaygroundStats";
import type { AnalyzePostsRequest, ProfileSettings } from "@/api/models";
import { useAnalyzePosts, useInfiniteFeed } from "@/api/hooks";
import { Loader2 } from "lucide-react";
import type { BenchmarkStats, PlaygroundPost } from "@/components/playground/models";
import { DataTable } from "./data-table";
import { columns as createColumns } from "./columns";
import type { RowSelectionState } from "@tanstack/react-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface PlaygroundPostListProps {
  profileId: string;
  profileSettings: ProfileSettings;
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

  const { data: feed, isLoading: isLoadingFeed, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteFeed({
    profile_id: profileId || '', 
    order: 'new', 
    filters: { has_user_classification: true },
  });
  const { mutateAsync: analyzePostMutateAsync } = useAnalyzePosts();

  const isAnalyzingPost = (postId: string) => postsBeingAnalyzed.includes(postId);

  const handleAnalyzePost = async (postId: string) => {
    const postToAnalyze = playgroundPosts.find(p => p.originalPost.post.id === postId)?.originalPost;
    if (!postToAnalyze || postsBeingAnalyzed.includes(postId)) {
      return;
    }

    const request: AnalyzePostsRequest = {
      profile: profileSettings,
      post_ids: [postId]
    };

    setPostsBeingAnalyzed(prev => [...prev, postId]);

    try {
      const data = await analyzePostMutateAsync(request);
      if (data.detections && data.detections.length > 0) {
        const newDetection = data.detections[0];
        setPlaygroundPosts(prevPosts =>
          prevPosts.map(p =>
            p.originalPost.post.id === postId
              ? { ...p, newDetection: newDetection }
              : p
          )
        );
      }
      if (data.errors && data.errors.length > 0) {
        console.error("Error analyzing post:", data.errors[0]);
      }
    } catch (error) {
      console.error("Failed to analyze post:", error);
    } finally {
      setPostsBeingAnalyzed(prev => prev.filter(id => id !== postId));
    }
  };
  
  useEffect(() => {
    if (feed) {
      const allFeedPosts = feed.pages.flatMap(page => page);
      setPlaygroundPosts(prevPlaygroundPosts => {
        const existingPostIds = new Set(prevPlaygroundPosts.map(p => p.originalPost.post.id));
        const newPostsFromFeed = allFeedPosts
          .filter(fp => !existingPostIds.has(fp.post.id))
          .map(fp => ({ 
            originalPost: fp, 
            newDetection: fp.detection
          }));
        
        const updatedPosts = prevPlaygroundPosts.map(pp => {
            const updatedFeedPost = allFeedPosts.find(fp => fp.post.id === pp.originalPost.post.id);
            if (updatedFeedPost) {
                return { 
                    ...pp, 
                    originalPost: updatedFeedPost,
                    newDetection: pp.newDetection !== undefined ? pp.newDetection : updatedFeedPost.detection
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
      const postId = p.originalPost.post.id;
      
      if (postsBeingAnalyzed.includes(postId)) {
        return;
      }

      const detectionToConsider = p.newDetection ?? p.originalPost.detection;
      const expected = p.originalPost.user_classification.is_relevant;

      if (detectionToConsider) {
        newStats.analyzed++;
        if (expected !== undefined) {
          if (detectionToConsider.is_relevant === expected) {
            newStats.correct++;
          } else {
            newStats.wrong++;
          }
        }
      }
    });
    setStats(newStats);

  }, [playgroundPosts, postsBeingAnalyzed]);

  let filteredAndSlicedPosts = playgroundPosts.filter(p => {
    if (correctnessFilter === 'all') {
      return true;
    }
    const detectionToConsider = p.newDetection ?? p.originalPost.detection;
    const expected = p.originalPost.user_classification.is_relevant;
    
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

    await Promise.all(postsToAnalyze.map(post => handleAnalyzePost(post.originalPost.post.id)));
    setRowSelection({});
  };

  const handleAnalyzeIncorrect = async () => {
    const incorrectPosts = playgroundPosts.filter(p => {
      const detection = p.newDetection ?? p.originalPost.detection;
      return detection && p.originalPost.user_classification.is_relevant !== undefined && detection.is_relevant !== p.originalPost.user_classification.is_relevant;
    });
    if (incorrectPosts.length === 0) return;

    await Promise.all(incorrectPosts.map(post => handleAnalyzePost(post.originalPost.post.id)));
  };

  const handleAnalyzeAll = async () => {
    if (playgroundPosts.length === 0) return;
    await Promise.all(playgroundPosts.map(post => handleAnalyzePost(post.originalPost.post.id)));
  };

  const selectedCount = Object.keys(rowSelection).filter(k => rowSelection[k]).length;
  const incorrectCountForAllPosts = playgroundPosts.filter(p => {
      const detection = p.newDetection ?? p.originalPost.detection;
      return detection && p.originalPost.user_classification.is_relevant !== undefined && detection.is_relevant !== p.originalPost.user_classification.is_relevant;
    }).length;

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
            disabled={incorrectCountForAllPosts === 0 || postsBeingAnalyzed.length > 0}
            variant="outline"
          >
            Analyze Incorrect ({incorrectCountForAllPosts})
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
    </div>
  );
} 