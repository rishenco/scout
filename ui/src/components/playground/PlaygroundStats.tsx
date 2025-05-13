import { Card, CardContent } from "@/components/ui/card";
import type { BenchmarkStats } from "./models";

interface PlaygroundStatsProps {
  stats: BenchmarkStats;
}

export function PlaygroundStats({ stats }: PlaygroundStatsProps) {
  const correctRate = stats.analyzed > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const wrongRate = stats.analyzed > 0 ? Math.round((stats.wrong / stats.total) * 100) : 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Posts</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.analyzed}</div>
            <div className="text-sm text-muted-foreground">Analyzed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.correct}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.wrong}</div>
            <div className="text-sm text-muted-foreground">Wrong</div>
          </div>
        </div>
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-400"
                style={{ width: `${correctRate}%` }}
              />
              <div 
                className="h-full bg-red-400" 
                style={{ width: `${wrongRate}%` }}
              />
            </div>
            <div className="mt-1 text-center text-sm text-muted-foreground">
              {correctRate}% Correct Rate
            </div>
        </div>
      </CardContent>
    </Card>
  );
} 