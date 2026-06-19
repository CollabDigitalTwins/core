// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

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
