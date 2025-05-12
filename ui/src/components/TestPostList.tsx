import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TestPostCard } from "@/components/TestPostCard";
import { TestStats } from "@/components/TestStats";
import type { UserClassificationWithPost } from "@/api/models";
import { PostDialog } from "@/components/PostDialog";

interface TestPostListProps {
  profileId: string;
  userClassifications: UserClassificationWithPost[];
  analysisResults?: Record<string, {
    is_relevant: boolean;
    extracted_properties: Record<string, string>;
  }>;
  isAnalyzing: boolean;
  onAnalyze: (postIds: string[]) => void;
}

export function TestPostList({
  profileId,
  userClassifications,
  analysisResults = {},
  isAnalyzing,
  onAnalyze,
}: TestPostListProps) {
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPost, setViewingPost] = useState<UserClassificationWithPost | null>(null);

  // Get analysis statistics
  const analyzedPosts = userClassifications.filter(c => analysisResults[c.post_id]);
  const passedPosts = analyzedPosts.filter(c => 
    analysisResults[c.post_id]?.is_relevant === c.is_relevant
  );
  const failedPosts = analyzedPosts.filter(c => 
    analysisResults[c.post_id]?.is_relevant !== c.is_relevant
  );

  // Filter posts based on tabs and search
  const filteredPosts = userClassifications.filter(classification => {
    const analysisResult = analysisResults[classification.post_id];
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'correct' && analysisResult?.is_relevant === classification.is_relevant) ||
      (filter === 'incorrect' && analysisResult?.is_relevant !== classification.is_relevant);
    
    const matchesSearch = 
      !searchTerm || 
      classification.post.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPostIds(filteredPosts.map(c => c.post_id));
    } else {
      setSelectedPostIds([]);
    }
  };

  const togglePostSelection = (postId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPostIds(prev => [...prev, postId]);
    } else {
      setSelectedPostIds(prev => prev.filter(id => id !== postId));
    }
  };

  const handleAnalyzeSelected = () => {
    if (selectedPostIds.length > 0) {
      onAnalyze(selectedPostIds);
    }
  };

  const handleAnalyzeIncorrect = () => {
    const incorrectPostIds = failedPosts.map(c => c.post_id);
    if (incorrectPostIds.length > 0) {
      onAnalyze(incorrectPostIds);
    }
  };

  const handleAnalyzeAll = () => {
    const allPostIds = userClassifications.map(c => c.post_id);
    if (allPostIds.length > 0) {
      onAnalyze(allPostIds);
    }
  };

  return (
    <div>
      <TestStats 
        total={userClassifications.length}
        analyzed={analyzedPosts.length}
        passed={passedPosts.length}
        failed={failedPosts.length}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button 
          onClick={handleAnalyzeSelected} 
          disabled={selectedPostIds.length === 0 || isAnalyzing}
        >
          Analyze Selected ({selectedPostIds.length})
        </Button>
        <Button 
          onClick={handleAnalyzeIncorrect} 
          disabled={failedPosts.length === 0 || isAnalyzing}
          variant="outline"
        >
          Analyze Incorrect ({failedPosts.length})
        </Button>
        <Button 
          onClick={handleAnalyzeAll} 
          disabled={userClassifications.length === 0 || isAnalyzing}
          variant="outline"
        >
          Analyze All ({userClassifications.length})
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="select-all" 
            checked={selectedPostIds.length === filteredPosts.length && filteredPosts.length > 0} 
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="cursor-pointer">Select All</Label>
        </div>
        <div className="flex-1">
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-4">
        <TabsList>
          <TabsTrigger 
            value="all" 
            onClick={() => setFilter('all')}
          >
            All ({userClassifications.length})
          </TabsTrigger>
          <TabsTrigger 
            value="correct" 
            onClick={() => setFilter('correct')}
            disabled={passedPosts.length === 0}
          >
            Correct ({passedPosts.length})
          </TabsTrigger>
          <TabsTrigger 
            value="incorrect" 
            onClick={() => setFilter('incorrect')}
            disabled={failedPosts.length === 0}
          >
            Incorrect ({failedPosts.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredPosts.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          {userClassifications.length === 0
            ? "No labeled posts found for this profile."
            : "No posts match the current filters."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPosts.map((classification) => (
            <TestPostCard
              key={classification.post_id}
              userClassification={classification}
              analysisResult={analysisResults[classification.post_id]}
              isSelected={selectedPostIds.includes(classification.post_id)}
              onSelectChange={(checked) => togglePostSelection(classification.post_id, checked)}
              onClick={() => setViewingPost(classification)}
            />
          ))}
        </div>
      )}

      {viewingPost && (
        <PostDialog
          detection={analysisResults[viewingPost.post_id]}
          isOpen={!!viewingPost}
          onClose={() => setViewingPost(null)}
        />
      )}
    </div>
  );
} 