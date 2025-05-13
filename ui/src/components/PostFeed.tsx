import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { FeedFilters as FeedFiltersComponent} from '@/components/FeedFilters'
import { PostCard } from '@/components/PostCard'
import { useInfiniteFeed } from '@/api/hooks'
import type { FeedFilters } from '@/api/models'

interface PostFeedProps {
  profileId: string
}


export function PostFeed({ profileId }: PostFeedProps) {
  const [filters, setFilters] = useState<FeedFilters>({
    is_relevant: true,
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
  } = useInfiniteFeed({
    profile_id: profileId,
    filters: filters,
    order: 'new', 
  });

  // Flatten the pages data from the hook into a single array
  const allPosts = data?.pages.flatMap(page => page) ?? []
  // Load more when scroll reaches the end and there are more pages
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])
  
  // Handle filter changes - changing filters automatically triggers refetch via queryKey
  const handleFiltersChange = (newFilters: FeedFilters) => {
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
            detection={feedPost.detection} 
            post={feedPost.post}
            userClassification={feedPost.user_classification}
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
