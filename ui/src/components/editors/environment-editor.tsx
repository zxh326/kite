import { useEffect, useState } from 'react'
import { Container, EnvVar } from 'kubernetes-types/core/v1'
import { Plus, Trash2 } from 'lucide-react'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface EnvironmentEditorProps {
  container: Container
  onUpdate: (updates: Partial<Container>) => void
}

export function EnvironmentEditor({
  container,
  onUpdate,
}: EnvironmentEditorProps) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])

  useEffect(() => {
    setEnvVars(container.env || [])
  }, [container.env])

  const addEnvVar = () => {
    const newEnvVars = [...envVars, { name: '', value: '' }]
    setEnvVars(newEnvVars)
    onUpdate({ env: newEnvVars.filter((env) => env.name.trim() !== '') })
  }

  const removeEnvVar = (index: number) => {
    const newEnvVars = envVars.filter((_, i) => i !== index)
    setEnvVars(newEnvVars)
    onUpdate({ env: newEnvVars.filter((env) => env.name.trim() !== '') })
  }

  const updateEnvVar = (
    index: number,
    field: 'name' | 'value',
    value: string
  ) => {
    const newEnvVars = envVars.map((env, i) =>
      i === index ? { ...env, [field]: value } : env
    )
    setEnvVars(newEnvVars)
    onUpdate({ env: newEnvVars.filter((env) => env.name.trim() !== '') })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Environment Variables</Label>
        <Button onClick={addEnvVar} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Variable
        </Button>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {envVars.map((env, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-3 border rounded-lg"
          >
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                <div className="lg:col-span-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    placeholder="Variable name"
                    value={env.name}
                    onChange={(e) =>
                      updateEnvVar(index, 'name', e.target.value)
                    }
                    className="font-mono text-sm"
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label className="text-xs text-muted-foreground">Value</Label>
                  <Input
                    placeholder="Variable value"
                    value={env.value || ''}
                    onChange={(e) =>
                      updateEnvVar(index, 'value', e.target.value)
                    }
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              {env.value && env.value.length > 50 && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                  <span className="font-medium">Full value:</span>
                  <div className="mt-1 font-mono break-all">{env.value}</div>
                </div>
              )}
            </div>
            <Button
              onClick={() => removeEnvVar(index)}
              size="sm"
              variant="ghost"
              className="text-red-500 hover:text-red-700 mt-5"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {envVars.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No environment variables configured
          </div>
        )}
      </div>
    </div>
  )
}
