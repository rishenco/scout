import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { DetectionFilter } from '@/api/models'

interface FeedFiltersProps {
  filters: DetectionFilter
  onFiltersChange: (filters: DetectionFilter) => void
}

export function FeedFilters({ filters, onFiltersChange }: FeedFiltersProps) {
  const isRelevantKey = filters.is_relevant === undefined ? 'all' : filters.is_relevant ? 'relevant' : 'irrelevant'

  const handleRelevancyChange = (value: string) => {
    onFiltersChange({
      ...filters,
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
    </div>
  )
} 