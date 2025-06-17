import { useState } from 'react'
import { Container } from 'kubernetes-types/core/v1'

import { EnvironmentEditor, ImageEditor, ResourceEditor } from '../editors'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

interface ContainerEditPageProps {
  container: Container
  onSave: (updatedContainer: Container) => void
  onCancel: () => void
}

export function ContainerEditPage({
  container,
  onSave,
  onCancel,
}: ContainerEditPageProps) {
  const [editedContainer, setEditedContainer] = useState<Container>(container)

  const handleUpdate = (updates: Partial<Container>) => {
    setEditedContainer((prev) => ({ ...prev, ...updates }))
  }

  const handleSave = () => {
    onSave(editedContainer)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Container: {container.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Image Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageEditor container={editedContainer} onUpdate={handleUpdate} />
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <EnvironmentEditor
              container={editedContainer}
              onUpdate={handleUpdate}
            />
          </CardContent>
        </Card>
      </div>

      {/* Resource Configuration - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceEditor container={editedContainer} onUpdate={handleUpdate} />
        </CardContent>
      </Card>
    </div>
  )
}
