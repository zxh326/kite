import { Container } from 'kubernetes-types/core/v1'

import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

interface ImageEditorProps {
  container: Container
  onUpdate: (updates: Partial<Container>) => void
}

export function ImageEditor({ container, onUpdate }: ImageEditorProps) {
  const updateImage = (image: string) => {
    onUpdate({ image })
  }

  const updateImagePullPolicy = (imagePullPolicy: string) => {
    onUpdate({
      imagePullPolicy:
        imagePullPolicy === 'default' ? undefined : imagePullPolicy,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="container-image">Container Image</Label>
        <Input
          id="container-image"
          value={container.image || ''}
          onChange={(e) => updateImage(e.target.value)}
          placeholder="nginx:latest"
        />
        <p className="text-sm text-muted-foreground">
          Specify the container image including tag (e.g., nginx:1.21,
          node:16-alpine)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-pull-policy">Image Pull Policy</Label>
        <Select
          value={container.imagePullPolicy || 'default'}
          onValueChange={updateImagePullPolicy}
        >
          <SelectTrigger id="image-pull-policy" className="w-full">
            <SelectValue placeholder="Select pull policy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="IfNotPresent">IfNotPresent</SelectItem>
            <SelectItem value="Always">Always</SelectItem>
            <SelectItem value="Never">Never</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          <strong>IfNotPresent:</strong> Pull image only if not present locally
          <br />
          <strong>Always:</strong> Always pull the latest image
          <br />
          <strong>Never:</strong> Never pull, use local image only
        </p>
      </div>
    </div>
  )
}
