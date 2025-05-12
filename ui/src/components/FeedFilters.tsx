import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export type FeedFiltersValues = {
  relevancy: 'all' | 'relevant' | 'irrelevant'
}

interface FeedFiltersProps {
  filters: FeedFiltersValues
  onFiltersChange: (filters: FeedFiltersValues) => void
}

export function FeedFilters({ filters, onFiltersChange }: FeedFiltersProps) {
  const handleRelevancyChange = (value: string) => {
    onFiltersChange({
      ...filters,
      relevancy: value as FeedFiltersValues['relevancy']
    })
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-card rounded-lg border shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="relevancy-filter">Relevancy</Label>
        <Select
          value={filters.relevancy}
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