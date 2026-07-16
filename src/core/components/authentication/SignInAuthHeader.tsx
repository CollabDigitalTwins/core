type AuthHeaderProps = {
  title: string
  message: string
}

export function AuthHeader({ title, message }: AuthHeaderProps) {
  return (
    <div className="space-y-2 text-left">
      <h1
        className="font-display font-bold"
        style={{
          fontSize: '1.75rem',
          lineHeight: '1.1',
          letterSpacing: '-0.02em',
          color: 'var(--hp-on-surface)',
        }}
      >
        {title}
      </h1>

      <p
        style={{
          color: 'var(--hp-on-surface-variant)',
          fontSize: '0.9rem',
        }}
      >
        {message}
      </p>
    </div>
  )
}