import { Editor } from '@monaco-editor/react'
import { formatHex } from 'culori'

import { useAppearance } from './appearance-provider'

interface SimpleYamlEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  disabled?: boolean
  height?: string
}

export function SimpleYamlEditor({
  value,
  onChange,
  disabled = false,
  height = '400px',
}: SimpleYamlEditorProps) {
  const { actualTheme, colorTheme } = useAppearance()

  const getCardBackgroundColor = () => {
    const card = getComputedStyle(document.documentElement)
      .getPropertyValue('--background')
      .trim()
    if (!card) {
      return actualTheme === 'dark' ? '#18181b' : '#ffffff'
    }
    return formatHex(card) || (actualTheme === 'dark' ? '#18181b' : '#ffffff')
  }
  return (
    <div className="border rounded-md overflow-hidden">
      <Editor
        height={height}
        defaultLanguage="yaml"
        value={value}
        onChange={onChange}
        beforeMount={(monaco) => {
          const cardBgColor = getCardBackgroundColor()
          monaco.editor.defineTheme(`custom-dark-${colorTheme}`, {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': cardBgColor,
            },
          })
          monaco.editor.defineTheme(`custom-vs-${colorTheme}`, {
            base: 'vs',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': cardBgColor,
            },
          })
        }}
        theme={
          actualTheme === 'dark'
            ? `custom-dark-${colorTheme}`
            : `custom-vs-${colorTheme}`
        }
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          readOnly: disabled,
          fontSize: 14,
          lineNumbers: 'on',
          folding: true,
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          renderWhitespace: 'boundary',
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          fontFamily:
            "'Maple Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
        }}
        loading={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}
