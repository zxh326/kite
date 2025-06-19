import { Editor } from '@monaco-editor/react'
import { useTheme } from 'next-themes'

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
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
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
