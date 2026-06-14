interface ProgressBarProps {
  done: number
  total: number
}

export default function ProgressBar({ done, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
          {done} von {total} erledigt
        </span>
        <span style={{ color: pct === 100 ? 'var(--success)' : 'var(--accent-light)', fontSize: '12px', fontWeight: 700 }}>
          {pct}%
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? 'var(--success)' : undefined
          }}
        />
      </div>
    </div>
  )
}
