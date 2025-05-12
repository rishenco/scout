import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { FeedFilters, type FeedFiltersValues } from '@/components/FeedFilters'
import { PostCard } from '@/components/PostCard'
import { useDetections } from '@/api/hooks'
import { type DetectionWithPost } from '@/api/models'

interface PostFeedProps {
  profileId: string
}

const POST_LIMIT = 3 // 3 for debugging, will be increased later

export function PostFeed({ profileId }: PostFeedProps) {
  const [filters, setFilters] = useState<FeedFiltersValues>({
    relevancy: 'relevant'
  })
  
  const [offset, setOffset] = useState(0)
  const [posts, setPosts] = useState<DetectionWithPost[]>([])
  
  // Reset offset when filters change
  useEffect(() => {
    setOffset(0)
    setPosts([])
  }, [filters])
  
  // Setup infinite scroll with intersection observer
  const { ref, inView } = useInView()
  
  // Convert filter values to API parameters
  const isRelevant = filters.relevancy === 'all' 
    ? undefined 
    : filters.relevancy === 'relevant'
  
  // Fetch posts with current filters and pagination
  const { data, isLoading, isFetching } = useDetections({
    profile_id: profileId,
    is_relevant: isRelevant,
    limit: POST_LIMIT,
    offset,
  })
  
  // Append new data when it's available
  useEffect(() => {
    if (data && data.length > 0) {
      setPosts(prevPosts => {
        // Only append if we're not on page 0 (after filter reset)
        if (offset === 0) {
          return data
        }
        // Make sure we don't duplicate posts
        const existingIds = new Set(prevPosts.map(post => post.id))
        const newPosts = data.filter(post => !existingIds.has(post.id))
        return [...prevPosts, ...newPosts]
      })
    }
  }, [data, offset])
  
  // Load more when scroll reaches the end and we're not already fetching
  useEffect(() => {
    if (inView && !isLoading && !isFetching && data && data.length === POST_LIMIT) {
      setOffset(prevOffset => prevOffset + POST_LIMIT)
    }
  }, [inView, isLoading, isFetching, data])
  
  // Handle filter changes
  const handleFiltersChange = (newFilters: FeedFiltersValues) => {
    setFilters(newFilters)
  }
  
  return (
    <div className="space-y-4">
      <FeedFilters 
        filters={filters} 
        onFiltersChange={handleFiltersChange} 
      />
      
      <div className="space-y-4">
        {/* Map through loaded posts */}
        {posts.map(detection => (
          <PostCard 
            key={detection.id} 
            detection={detection} 
          />
        ))}
        
        {/* Show loading skeletons for initial load */}
        {isLoading && offset === 0 && (
          Array.from({ length: 3 }, (_, i) => (
            <PostCard key={`loading-${i}`} isLoading />
          ))
        )}
        
        {/* Show a loading indicator for infinite scroll */}
        {(isFetching && offset > 0) && (
          <PostCard isLoading />
        )}
        
        {/* This empty div is used as the intersection target for infinite scrolling */}
        <div ref={ref} className="h-10" />
        
        {/* Show message when no posts match filters */}
        {!isLoading && posts.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No posts found with the current filters.</p>
          </div>
        )}
      </div>
    </div>
  )
} 