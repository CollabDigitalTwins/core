interface PasswordErrorProps {
  message: string
}

export function PasswordError({ message }: PasswordErrorProps) {
  if (!message) return null

  return (
    <div className="auth-pw-error">
      {message}
    </div>
  )
}
