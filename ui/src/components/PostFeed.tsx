import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { FeedFilters as FeedFiltersComponent} from '@/components/FeedFilters'
import { PostCard } from '@/components/PostCard'
import { useInfiniteDetections } from '@/api/hooks'
import type { DetectionFilter } from '@/api/models'

interface PostFeedProps {
  profileId: string
}


export function PostFeed({ profileId }: PostFeedProps) {
  const [filters, setFilters] = useState<DetectionFilter>({
    is_relevant: true,
    profiles: [parseInt(profileId)],
  })
  
  // Setup infinite scroll with intersection observer
  const { ref, inView } = useInView({
    threshold: 0, // Trigger when the element enters the viewport
  })
  
  // Fetch posts with useInfiniteFeed hook
  const { 
    data, 
    isLoading, 
    isFetchingNextPage, 
    fetchNextPage, 
    hasNextPage 
  } = useInfiniteDetections(filters);

  // Flatten the pages data from the hook into a single array
  const allPosts = data?.pages.flatMap(page => page) ?? []
  // Load more when scroll reaches the end and there are more pages
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])
  
  // Handle filter changes - changing filters automatically triggers refetch via queryKey
  const handleFiltersChange = (newFilters: DetectionFilter) => {
    setFilters(newFilters)
  }
  
  return (
    <div className="space-y-4">
      <FeedFiltersComponent 
        filters={filters}
        onFiltersChange={handleFiltersChange} 
      />
      
      <div className="space-y-4">
        {/* Map through flattened posts */}
        {allPosts.map(feedPost => (
          <PostCard 
            key={feedPost.detection.id} // Use detection ID as key
            detection={feedPost}
          />
        ))}
        
        {/* Show loading skeletons for initial load */}
        {isLoading && (
          Array.from({ length: 3 }, (_, i) => (
            <PostCard key={`loading-${i}`} isLoading />
          ))
        )}
        
        {/* Show a loading indicator for infinite scroll */}
        {isFetchingNextPage && (
          <PostCard isLoading />
        )}
        
        {/* Intersection target for infinite scrolling - load more when this becomes visible */}
        {/* Only render the ref if there are more pages to load */}
        {hasNextPage && <div ref={ref} className="h-10" />} 
        
        {/* Show message when no posts match filters after initial load */}
        {!isLoading && !isFetchingNextPage && allPosts.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No posts found with the current filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
