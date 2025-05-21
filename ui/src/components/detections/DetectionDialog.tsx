import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ListedDetection } from '@/api/models'
import { DetectionCard } from "./DetectionCard"

interface DetectionDialogProps {
  listedDetection: ListedDetection
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DetectionDialog({ listedDetection, open, onOpenChange }: DetectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} >
      <DialogTitle>
        <span></span>
      </DialogTitle>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DetectionCard
          listedDetection={listedDetection}
          compact={false}
        />
      </DialogContent>
    </Dialog>
  )
} 