import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface TestStatsProps {
  total: number;
  analyzed: number;
  passed: number;
  failed: number;
}

export function TestStats({ total, analyzed, passed, failed }: TestStatsProps) {
  const passRate = analyzed > 0 ? Math.round((passed / analyzed) * 100) : 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-sm text-muted-foreground">Total Posts</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{analyzed}</div>
            <div className="text-sm text-muted-foreground">Analyzed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{passed}</div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>
        {analyzed > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500"
                style={{ width: `${passRate}%` }}
              />
            </div>
            <div className="mt-1 text-center text-sm text-muted-foreground">
              {passRate}% Pass Rate
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 