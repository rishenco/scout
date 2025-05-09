import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
      <CardHeader>
        <CardTitle className="text-lg">Extracted Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(properties).map(([key, value]) => (
            <div key={key} className="border-b pb-2 last:border-0">
              <h3 className="font-medium text-sm">{key}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 