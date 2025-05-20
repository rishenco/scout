import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { DetectionFilter as DetectionFilterComponent} from '@/components/detections/DetectionFilter'
import { DetectionCard } from '@/components/detections/DetectionCard'
import { useInfiniteDetections } from '@/api/hooks'
import type { DetectionFilter, ListedDetection } from '@/api/models'
import { DetectionDialog } from '@/components/detections/DetectionDialog'

interface DetectionListProps {
  profileId: number
}

export function DetectionList({ profileId }: DetectionListProps) {
  const [filter, setFilter] = useState<DetectionFilter>({
    is_relevant: true,
    profiles: [profileId],
  })
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDetection, setSelectedDetection] = useState<ListedDetection | null>(null)
  
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
  } = useInfiniteDetections(filter);

  // Flatten the pages data from the hook into a single array
  const allDetections = data?.pages.flatMap(page => page) ?? []
  // Load more when scroll reaches the end and there are more pages
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // update selected detection when data changes (because of like updates)
  useEffect(() => {
    if (!selectedDetection || !allDetections) {
      return
    }
    const detection = allDetections.find(d => d.detection.id === selectedDetection.detection.id)
    if (detection) {
      setSelectedDetection(detection)
    }
  }, [allDetections, selectedDetection])
  
  // Handle filter changes - changing filters automatically triggers refetch via queryKey
  const handleFilterChange = (newFilter: DetectionFilter) => {
    setFilter(newFilter)
  }

  const handleCardClick = (detection: ListedDetection) => {
    setSelectedDetection(detection)
    setIsDialogOpen(true)
  }

  
  return (
    <div className="space-y-4">
      <DetectionFilterComponent 
        filter={filter}
        onFilterChange={handleFilterChange} 
      />
      
      <div className="space-y-4">
        {/* Map through flattened posts */}
        {allDetections.map(detection => (
          <DetectionCard 
            key={detection.detection.id} // Use detection ID as key
            listedDetection={detection}
            onCardClick={() => handleCardClick(detection)}
            compact={true}
          />
        ))}
        
        {/* Show loading skeletons for initial load */}
        {isLoading && (
          Array.from({ length: 3 }, (_, i) => (
            <DetectionCard key={`loading-${i}`} isLoading />
          ))
        )}
        
        {/* Show a loading indicator for infinite scroll */}
        {isFetchingNextPage && (
          <DetectionCard key={`loading`} isLoading />
        )}
        
        {/* Intersection target for infinite scrolling - load more when this becomes visible */}
        {/* Only render the ref if there are more pages to load */}
        {hasNextPage && <div ref={ref} className="h-10" />} 
        
        {/* Show message when no posts match filters after initial load */}
        {!isLoading && !isFetchingNextPage && allDetections.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No detections found with the current filters.</p>
          </div>
        )}
      </div>

      {selectedDetection && (
        <DetectionDialog
          listedDetection={selectedDetection}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </div>
  )
}
