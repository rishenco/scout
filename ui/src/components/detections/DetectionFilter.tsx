import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { DetectionFilter } from '@/api/models'

interface DetectionFilterProps {
  filter: DetectionFilter
  onFilterChange: (filter: DetectionFilter) => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function DetectionFilter({ filter, onFilterChange, onRefresh, isRefreshing }: DetectionFilterProps) {
  const isRelevantKey = filter.is_relevant === undefined ? 'all' : filter.is_relevant ? 'relevant' : 'irrelevant'

  const handleRelevancyChange = (value: string) => {
    onFilterChange({
      ...filter,
      is_relevant: value === 'all' ? undefined : value === 'relevant'
    })
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-card rounded-lg border shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="relevancy-filter">Relevancy</Label>
        <Select
          value={isRelevantKey}
          onValueChange={handleRelevancyChange}
        >
          <SelectTrigger id="relevancy-filter" className="w-[180px]">
            <SelectValue placeholder="Filter by relevancy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="relevant">Relevant</SelectItem>
            <SelectItem value="irrelevant">Irrelevant</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {onRefresh && (
        <div className="flex flex-col gap-1.5">
          <Label>&nbsp;</Label>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}
    </div>
  )
} 