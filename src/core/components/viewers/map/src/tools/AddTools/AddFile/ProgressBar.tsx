export const ProgressBar = ({ value, max = 100, className = '' }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      className={`w-full bg-gray-200 h-2 overflow-hidden ${className}`}
      style={{ borderRadius: '9999px' }}
    >
      <div
        className="h-full bg-black transition-all duration-300 ease-out"
        style={{
          width: `${percentage}%`,
          borderRadius: '9999px',
        }}
      />
    </div>
  )
}
