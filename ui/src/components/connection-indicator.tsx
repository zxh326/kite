export const ConnectionIndicator: React.FC<{
  isConnected: boolean
}> = ({ isConnected }) => {
  if (isConnected) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-green-400 breathing-indicator"></div>
      </div>
    )
  } else {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400 breathing-indicator"></div>
      </div>
    )
  }
}
