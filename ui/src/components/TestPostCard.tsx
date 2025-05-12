import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExtractedProperties } from "@/components/ExtractedProperties";
import type { UserClassificationWithPost } from "@/api/models";
import { cn } from "@/lib/utils";

interface TestPostCardProps {
  userClassification: UserClassificationWithPost;
  analysisResult?: {
    is_relevant: boolean;
    extracted_properties: Record<string, string>;
  };
  isSelected: boolean;
  onSelectChange: (isSelected: boolean) => void;
  onClick: () => void;
}

export function TestPostCard({
  userClassification,
  analysisResult,
  isSelected,
  onSelectChange,
  onClick,
}: TestPostCardProps) {
  const { post, is_relevant: expected } = userClassification;
  const actual = analysisResult?.is_relevant;
  const isMatch = actual === undefined || actual === expected;

  return (
    <Card 
      className={cn(
        "mb-4 hover:bg-accent/50 cursor-pointer transition-colors",
        !isMatch && "border-destructive",
        isSelected && "ring-1 ring-primary"
      )} 
      onClick={onClick}
    >
      <CardHeader className="py-3 px-4 flex flex-row items-center gap-2">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={(checked: boolean) => onSelectChange(!!checked)}
          />
        </div>
        <CardTitle className="text-base flex-1 truncate">
          {post.title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={expected ? "default" : "outline"}>
            Expected: {expected ? "Relevant" : "Not Relevant"}
          </Badge>
          {actual !== undefined && (
            <Badge 
              variant={isMatch ? "outline" : "destructive"}
            >
              Actual: {actual ? "Relevant" : "Not Relevant"}
            </Badge>
          )}
        </div>
      </CardHeader>
      {analysisResult && (
        <CardContent className="py-2 px-4">
          <ExtractedProperties properties={analysisResult.extracted_properties} />
        </CardContent>
      )}
    </Card>
  );
} 