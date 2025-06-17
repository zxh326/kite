import { Container, Volume } from 'kubernetes-types/core/v1'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface VolumeTableProps {
  namespace: string
  volumes?: Volume[]
  containers?: Container[]
  isLoading?: boolean
}

export function VolumeTable({
  namespace,
  volumes,
  containers,
  isLoading,
}: VolumeTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Volumes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Loading volumes...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volumes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {volumes?.length ? (
            volumes.map((volume, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-muted-foreground">
                      {volume.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <p className="text-sm text-muted-foreground">
                      {Object.keys(volume).filter((key) => key !== 'name')[0] ||
                        'Unknown'}
                    </p>
                  </div>
                  {volume.persistentVolumeClaim && (
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium">
                        PVC Claim Name
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        <Link
                          to={`/persistentvolumeclaims/${namespace}/${volume.persistentVolumeClaim.claimName}`}
                          className="text-blue-600 hover:underline"
                        >
                          {volume.persistentVolumeClaim.claimName}
                        </Link>
                      </p>
                    </div>
                  )}
                  {volume.configMap && (
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium">
                        ConfigMap Name
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {volume.configMap.name || 'N/A'}
                      </p>
                    </div>
                  )}
                  {volume.secret && (
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium">Secret Name</Label>
                      <p className="text-sm text-muted-foreground">
                        {volume.secret.secretName || 'N/A'}
                      </p>
                    </div>
                  )}
                  {volume.hostPath && (
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium">Host Path</Label>
                      <p className="text-sm text-muted-foreground">
                        {volume.hostPath.path || 'N/A'}
                      </p>
                    </div>
                  )}
                  {volume.emptyDir && (
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium">
                        Empty Directory
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Medium: {volume.emptyDir.medium || 'Default'}
                        {volume.emptyDir.sizeLimit &&
                          `, Size Limit: ${volume.emptyDir.sizeLimit}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Volume Mounts */}
                <div className="mt-4">
                  <Label className="text-sm font-medium">Volume Mounts</Label>
                  <div className="mt-2 space-y-2">
                    {containers?.map((container) =>
                      container.volumeMounts
                        ?.filter((mount) => mount.name === volume.name)
                        .map((mount, mountIndex) => (
                          <div
                            key={`${container.name}-${mountIndex}`}
                            className="flex items-center gap-4 text-sm bg-muted/50 p-2 rounded"
                          >
                            <span className="font-medium">
                              {container.name}
                            </span>
                            <span>→</span>
                            <span>{mount.mountPath}</span>
                            {mount.readOnly && (
                              <Badge variant="secondary" className="text-xs">
                                ReadOnly
                              </Badge>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No volumes configured for this resource.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
