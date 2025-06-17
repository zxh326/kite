import { useState } from 'react'
import { Deployment } from 'kubernetes-types/apps/v1'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { createResource } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { NamespaceSelector } from '../namespace-selector'

interface DeploymentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (deployment: Deployment, namespace: string) => void
  defaultNamespace?: string
}

interface DeploymentFormData {
  name: string
  namespace: string
  image: string
  replicas: number
  containerName: string
  labels: Array<{ key: string; value: string }>
  env: Array<{ name: string; value: string }>
  port?: number
  pullPolicy: 'Always' | 'IfNotPresent' | 'Never'
  resources: {
    requests: {
      cpu: string
      memory: string
    }
    limits: {
      cpu: string
      memory: string
    }
  }
}

const initialFormData: DeploymentFormData = {
  name: '',
  namespace: 'default',
  image: '',
  replicas: 1,
  containerName: '',
  labels: [{ key: 'app', value: '' }],
  env: [],
  pullPolicy: 'IfNotPresent',
  resources: {
    requests: {
      cpu: '',
      memory: '',
    },
    limits: {
      cpu: '',
      memory: '',
    },
  },
}

export function DeploymentCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultNamespace,
}: DeploymentCreateDialogProps) {
  const [formData, setFormData] = useState<DeploymentFormData>({
    ...initialFormData,
    namespace: defaultNamespace || 'default',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [step, setStep] = useState(1)
  const totalSteps = 3

  const updateFormData = (updates: Partial<DeploymentFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const addLabel = () => {
    setFormData((prev) => ({
      ...prev,
      labels: [...prev.labels, { key: '', value: '' }],
    }))
  }

  const updateLabel = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.map((label, i) =>
        i === index ? { ...label, [field]: value } : label
      ),
    }))
  }

  const removeLabel = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.filter((_, i) => i !== index),
    }))
  }

  const addEnvVar = () => {
    setFormData((prev) => ({
      ...prev,
      env: [...prev.env, { name: '', value: '' }],
    }))
  }

  const updateEnvVar = (
    index: number,
    field: 'name' | 'value',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      env: prev.env.map((env, i) =>
        i === index ? { ...env, [field]: value } : env
      ),
    }))
  }

  const removeEnvVar = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      env: prev.env.filter((_, i) => i !== index),
    }))
  }

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return !!(
          formData.name &&
          formData.namespace &&
          formData.replicas > 0 &&
          formData.labels.every((label) => label.key && label.value)
        )
      case 2:
        return !!(formData.image && formData.containerName)
      case 3:
        return true // Review step - always valid
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleCreate = async () => {
    if (!validateStep(step)) return

    setIsCreating(true)
    try {
      // Build deployment object
      const labelsObj = formData.labels.reduce(
        (acc, label) => {
          if (label.key && label.value) {
            acc[label.key] = label.value
          }
          return acc
        },
        {} as Record<string, string>
      )

      // Ensure app label matches name if not set
      if (!labelsObj.app && formData.name) {
        labelsObj.app = formData.name
      }

      const deployment: Deployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: formData.name,
          namespace: formData.namespace,
          labels: labelsObj,
        },
        spec: {
          replicas: formData.replicas,
          selector: {
            matchLabels: labelsObj,
          },
          template: {
            metadata: {
              labels: labelsObj,
            },
            spec: {
              containers: [
                {
                  name: formData.containerName || formData.name,
                  image: formData.image,
                  imagePullPolicy: formData.pullPolicy,
                  ...(formData.env.length > 0 && {
                    env: formData.env.filter((env) => env.name && env.value),
                  }),
                  ...(formData.port && {
                    ports: [
                      {
                        containerPort: formData.port,
                      },
                    ],
                  }),
                  ...((formData.resources.requests.cpu ||
                    formData.resources.requests.memory ||
                    formData.resources.limits.cpu ||
                    formData.resources.limits.memory) && {
                    resources: {
                      ...((formData.resources.requests.cpu ||
                        formData.resources.requests.memory) && {
                        requests: {
                          ...(formData.resources.requests.cpu && {
                            cpu: formData.resources.requests.cpu,
                          }),
                          ...(formData.resources.requests.memory && {
                            memory: formData.resources.requests.memory,
                          }),
                        },
                      }),
                      ...((formData.resources.limits.cpu ||
                        formData.resources.limits.memory) && {
                        limits: {
                          ...(formData.resources.limits.cpu && {
                            cpu: formData.resources.limits.cpu,
                          }),
                          ...(formData.resources.limits.memory && {
                            memory: formData.resources.limits.memory,
                          }),
                        },
                      }),
                    },
                  }),
                },
              ],
            },
          },
        },
      }

      const createdDeployment = await createResource(
        'deployments',
        formData.namespace,
        deployment
      )

      toast.success(
        `Deployment "${formData.name}" created successfully in namespace "${formData.namespace}"`
      )

      // Reset form and close dialog
      setFormData({
        ...initialFormData,
        namespace: defaultNamespace || 'default',
      })
      setStep(1)
      onOpenChange(false)

      // Call success callback with created deployment
      onSuccess(createdDeployment, formData.namespace)
    } catch (error) {
      console.error('Failed to create deployment:', error)
      toast.error(
        `Failed to create deployment: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      // Reset form when dialog closes
      setFormData({
        ...initialFormData,
        namespace: defaultNamespace || 'default',
      })
      setStep(1)
    }
    onOpenChange(open)
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Deployment Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value
                  updateFormData({
                    name: value,
                    containerName: value, // Auto-fill container name
                  })
                  // Update app label with full name value
                  const appLabelIndex = formData.labels.findIndex(
                    (l) => l.key === 'app'
                  )
                  if (appLabelIndex !== -1) {
                    updateLabel(appLabelIndex, 'value', value)
                  }
                }}
                placeholder="my-app"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="namespace">Namespace *</Label>
              <NamespaceSelector
                selectedNamespace={formData.namespace}
                handleNamespaceChange={(namespace) =>
                  updateFormData({ namespace })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Labels *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLabel}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Label
                </Button>
              </div>
              <div className="space-y-2">
                {formData.labels.map((label, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="key"
                      value={label.key}
                      onChange={(e) =>
                        updateLabel(index, 'key', e.target.value)
                      }
                    />
                    <Input
                      placeholder="value"
                      value={label.value}
                      onChange={(e) =>
                        updateLabel(index, 'value', e.target.value)
                      }
                    />
                    {formData.labels.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLabel(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replicas">Replicas *</Label>
              <Input
                id="replicas"
                type="number"
                min="1"
                value={formData.replicas}
                onChange={(e) =>
                  updateFormData({ replicas: parseInt(e.target.value) || 1 })
                }
                required
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image">Container Image *</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => updateFormData({ image: e.target.value })}
                placeholder="nginx:latest"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="containerName">Container Name *</Label>
              <Input
                id="containerName"
                value={formData.containerName}
                onChange={(e) =>
                  updateFormData({ containerName: e.target.value })
                }
                placeholder="container-name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Resources (optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Requests
                  </Label>
                  <div className="space-y-1">
                    <Input
                      placeholder="CPU (e.g., 100m)"
                      value={formData.resources.requests.cpu}
                      onChange={(e) =>
                        updateFormData({
                          resources: {
                            ...formData.resources,
                            requests: {
                              ...formData.resources.requests,
                              cpu: e.target.value,
                            },
                          },
                        })
                      }
                    />
                    <Input
                      placeholder="Memory (e.g., 128Mi)"
                      value={formData.resources.requests.memory}
                      onChange={(e) =>
                        updateFormData({
                          resources: {
                            ...formData.resources,
                            requests: {
                              ...formData.resources.requests,
                              memory: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Limits
                  </Label>
                  <div className="space-y-1">
                    <Input
                      placeholder="CPU (e.g., 500m)"
                      value={formData.resources.limits.cpu}
                      onChange={(e) =>
                        updateFormData({
                          resources: {
                            ...formData.resources,
                            limits: {
                              ...formData.resources.limits,
                              cpu: e.target.value,
                            },
                          },
                        })
                      }
                    />
                    <Input
                      placeholder="Memory (e.g., 256Mi)"
                      value={formData.resources.limits.memory}
                      onChange={(e) =>
                        updateFormData({
                          resources: {
                            ...formData.resources,
                            limits: {
                              ...formData.resources.limits,
                              memory: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Environment Variables (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEnvVar}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variable
                </Button>
              </div>
              <div className="space-y-2">
                {formData.env.map((env, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="NAME"
                      value={env.name}
                      onChange={(e) =>
                        updateEnvVar(index, 'name', e.target.value)
                      }
                    />
                    <Input
                      placeholder="value"
                      value={env.value}
                      onChange={(e) =>
                        updateEnvVar(index, 'value', e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEnvVar(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Container Port (optional)</Label>
              <Input
                id="port"
                type="number"
                min="1"
                max="65535"
                value={formData.port || ''}
                onChange={(e) =>
                  updateFormData({
                    port: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="8080"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pullPolicy">Image Pull Policy</Label>
              <Select
                value={formData.pullPolicy}
                onValueChange={(value) =>
                  updateFormData({
                    pullPolicy: value as 'Always' | 'IfNotPresent' | 'Never',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IfNotPresent">IfNotPresent</SelectItem>
                  <SelectItem value="Always">Always</SelectItem>
                  <SelectItem value="Never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review Configuration</h3>
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div>
                <strong>Name:</strong> {formData.name}
              </div>
              <div>
                <strong>Namespace:</strong> {formData.namespace}
              </div>
              <div>
                <strong>Image:</strong> {formData.image}
              </div>
              <div>
                <strong>Container Name:</strong> {formData.containerName}
              </div>
              <div>
                <strong>Replicas:</strong> {formData.replicas}
              </div>
              {formData.port && (
                <div>
                  <strong>Port:</strong> {formData.port}
                </div>
              )}
              <div>
                <strong>Pull Policy:</strong> {formData.pullPolicy}
              </div>
              <div>
                <strong>Labels:</strong>
                <div className="ml-4 space-y-1">
                  {formData.labels.map((label, index) => (
                    <div key={index} className="text-sm">
                      {label.key}: {label.value}
                    </div>
                  ))}
                </div>
              </div>
              {formData.env.length > 0 && (
                <div>
                  <strong>Environment Variables:</strong>
                  <div className="ml-4 space-y-1">
                    {formData.env.map((env, index) => (
                      <div key={index} className="text-sm">
                        {env.name}: {env.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(formData.resources.requests.cpu ||
                formData.resources.requests.memory ||
                formData.resources.limits.cpu ||
                formData.resources.limits.memory) && (
                <div>
                  <strong>Resources:</strong>
                  <div className="ml-4 space-y-1">
                    {(formData.resources.requests.cpu ||
                      formData.resources.requests.memory) && (
                      <div className="text-sm">
                        <strong>Requests:</strong>
                        {formData.resources.requests.cpu &&
                          ` CPU: ${formData.resources.requests.cpu}`}
                        {formData.resources.requests.memory &&
                          ` Memory: ${formData.resources.requests.memory}`}
                      </div>
                    )}
                    {(formData.resources.limits.cpu ||
                      formData.resources.limits.memory) && (
                      <div className="text-sm">
                        <strong>Limits:</strong>
                        {formData.resources.limits.cpu &&
                          ` CPU: ${formData.resources.limits.cpu}`}
                        {formData.resources.limits.memory &&
                          ` Memory: ${formData.resources.limits.memory}`}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Basic Configuration'
      case 2:
        return 'Container & Resources'
      case 3:
        return 'Review & Create'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="!max-w-4xl max-h-[90vh] overflow-y-auto sm:!max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create Deployment</DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps}: {getStepTitle()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress indicator */}
          <div className="flex justify-between mb-6">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
              (stepNum) => (
                <div
                  key={stepNum}
                  className={`flex items-center ${
                    stepNum < totalSteps ? 'flex-1' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      stepNum <= step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {stepNum}
                  </div>
                  {stepNum < totalSteps && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        stepNum < step ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              )
            )}
          </div>

          {renderStep()}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => handleDialogChange(false)}
              >
                Cancel
              </Button>
              {step < totalSteps ? (
                <Button onClick={handleNext} disabled={!validateStep(step)}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={!validateStep(step) || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Deployment'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
