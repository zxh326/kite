import { Badge } from './ui/badge'
import { Label } from './ui/label'

export function LabelsAnno(props: {
  labels: Record<string, string>
  annotations: Record<string, string>
}) {
  const { labels, annotations } = props
  if (!labels && !annotations) {
    return null
  }

  if (
    Object.keys(labels).length === 0 &&
    Object.keys(annotations).length === 0
  ) {
    return null
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(labels).length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground">Labels</Label>
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(labels || {}).map(([key, value]) => (
                <Badge
                  key={key}
                  variant="outline"
                  className="text-xs font-mono"
                >
                  {key}: {value.slice(0, 50)}
                  {value.length > 50 ? '...' : ''}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {Object.keys(annotations || {}).length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground">Annotations</Label>
            <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
              {Object.entries(annotations || {}).map(([key, value]) => (
                <Badge
                  key={key}
                  variant="outline"
                  className="text-xs font-mono"
                >
                  {key}: {value.slice(0, 50)}
                  {value.length > 50 ? '...' : ''}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
