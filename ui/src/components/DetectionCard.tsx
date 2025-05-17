import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ListedDetection } from '@/api/models'
import { RedditDetectionCard } from './RedditDetectionCard'

interface DetectionCardProps {
  listedDetection?: ListedDetection
  isLoading?: boolean
}

export function DetectionCard({ listedDetection, isLoading = false }: DetectionCardProps) {
  if (isLoading || !listedDetection?.detection || !listedDetection?.source_post) {
    return (
      <Card className="w-full mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <Skeleton className="h-6 w-[300px] mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[100px]" />
        </CardFooter>
      </Card>
    )
  }

  switch (listedDetection.detection.source) {
    case 'reddit':
      return <RedditDetectionCard listedDetection={listedDetection} />
    default:
      return <div>Unknown source</div>
  }
} 