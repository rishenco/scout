import { Card, CardContent } from "@/components/ui/card"
import { renderMarkdown, type TextSegment } from "@/utils/renderMarkdown"

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
                <h2 className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {renderMarkdown(value).map((segment: TextSegment, index: number) =>
                    segment.type === 'link' && segment.href ? (
                      <a
                        key={index}
                        href={segment.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {segment.content}
                      </a>
                    ) : (
                      <span key={index}>{segment.content}</span>
                    )
                  )}
                </h2>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 