import { Editor } from '@monaco-editor/react'

import { useTheme } from './theme-provider'

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
  const { theme } = useTheme()

  return (
    <div className="border rounded-md overflow-hidden">
      <Editor
        height={height}
        defaultLanguage="yaml"
        value={value}
        onChange={onChange}
        beforeMount={(monaco) => {
          monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': '#18181b',
            },
          })
          monaco.editor.defineTheme('custom-vs', {
            base: 'vs',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': '#ffffff',
            },
          })
        }}
        theme={theme === 'dark' ? 'custom-dark' : 'custom-vs'}
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
