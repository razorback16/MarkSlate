interface WelcomeScreenProps {
  onNewFile: () => void
  onOpenFile: () => void
  onOpenFolder: () => void
}

export function WelcomeScreen({ onNewFile, onOpenFile, onOpenFolder }: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-logo">
          <h1 className="welcome-title">MarkSlate</h1>
          <p className="welcome-subtitle">A distraction-free markdown editor</p>
        </div>

        <div className="welcome-actions">
          <button className="welcome-action-btn" onClick={onNewFile}>
            <span className="welcome-action-icon">+</span>
            <span className="welcome-action-label">New Document</span>
            <span className="welcome-action-hint">⌘N</span>
          </button>

          <button className="welcome-action-btn" onClick={onOpenFile}>
            <span className="welcome-action-icon">📄</span>
            <span className="welcome-action-label">Open File</span>
            <span className="welcome-action-hint">⌘O</span>
          </button>

          <button className="welcome-action-btn" onClick={onOpenFolder}>
            <span className="welcome-action-icon">📁</span>
            <span className="welcome-action-label">Open Folder</span>
            <span className="welcome-action-hint">⌘⇧O</span>
          </button>
        </div>
      </div>
    </div>
  )
}
