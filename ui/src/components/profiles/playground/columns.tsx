import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { PlaygroundPost } from "@/components/profiles/playground/models"
import { RelevancyBadge } from "@/components/detections/RelevancyBadge"

const getRelevancyBadge = (isRelevant?: boolean) => {
  if (isRelevant === undefined) {
    return <Badge variant="outline">N/A</Badge>;
  }
  
  return <RelevancyBadge isRelevant={isRelevant} compact={true} />;
};


export const columns = (
  onAnalyzePost: (postId: string) => void,
  isAnalyzingPost: (postId: string) => boolean
): ColumnDef<PlaygroundPost>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center h-full">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="align-middle"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center h-full">
        <Checkbox
          checked={row.getIsSelected()}
          onClick={(e) => {
            e.stopPropagation()
            row.toggleSelected()
          }}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="align-middle"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "title",
    accessorFn: (row) => row.originalPost?.source_post?.post?.title,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ getValue }) => <div className="truncate max-w-xs">{getValue<string>()}</div>,
  },
  {
    id: "originalRelevancy",
    accessorFn: (row) => row.originalPost.detection.is_relevant,
    header: "Original",
    cell: ({ getValue }) => getRelevancyBadge(getValue<boolean | undefined>()),
  },
  {
    id: "expectedRelevancy",
    accessorFn: (row) => {
      const wasCorrect = row.originalPost?.tags?.relevancy_detected_correctly;
      const originalRelevancy = row.originalPost?.detection?.is_relevant;
      return wasCorrect ? originalRelevancy : !originalRelevancy;
    },
    header: "Expected",
    cell: ({ getValue }) => getRelevancyBadge(getValue<boolean | undefined>()),
  },
  {
    id: "newRelevancy",
    accessorFn: (row) => row.newDetection?.is_relevant,
    header: "New",
    cell: ({ row, getValue }) => {
      if (isAnalyzingPost(row.original.originalPost.detection.source_id)) {
        return <span className="inline-block animate-hourglass-turn">⌛</span>;
      }
      return getRelevancyBadge(getValue<boolean | undefined>());
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const post = row.original
      const postId = post.originalPost.detection.source_id

      return (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onAnalyzePost(postId)
          }}
          disabled={isAnalyzingPost(postId)}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )
    },
  },
] 