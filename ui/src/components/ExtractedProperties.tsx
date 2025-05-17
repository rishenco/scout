import { Card, CardContent } from "@/components/ui/card"

type ExtractedPropertiesProps = {
  properties: Record<string, string>
  className?: string
}

/**
 * Component to visualize properties extracted from a post
 */
export function ExtractedProperties({ properties, className }: ExtractedPropertiesProps) {
  // If there are no properties, return null
  if (!properties || Object.keys(properties).length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardContent className="py-2 px-3">
        <div className="space-y-0.5">
          {Object.entries(properties).map(([key, value]) => (
            <div key={key} className="border-b pb-0.5 last:border-0">
              <div className="flex gap-2">
                <h3 className="font-medium text-sm">{key}:</h3>
                <h2 className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</h2>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 