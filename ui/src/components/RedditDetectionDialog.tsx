import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ListedDetection } from '@/api/models'
import { RedditDetectionCard } from '@/components/RedditDetectionCard'

interface RedditDetectionDialogProps {
  listedDetection: ListedDetection
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RedditDetectionDialog({ listedDetection, open, onOpenChange }: RedditDetectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} >
      <DialogTitle>
        <span></span>
      </DialogTitle>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <RedditDetectionCard
          listedDetection={listedDetection}
          truncateContent={true}
          disableBorder={true}
        />
      </DialogContent>
    </Dialog>
  )
} 