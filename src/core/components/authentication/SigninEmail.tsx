import Image from 'next/image'
import * as React from 'react'

interface SigningEmailProps {
  url: string
}

export const SigninEmail: React.FC<Readonly<SigningEmailProps>> = ({
  url,
}) => (
  <div>
    <h1>Welcome to the Digital Twin Platform</h1>
    {url}
    <p>
      {' '}
      Please sign in to the digital twin by visting this
      <a href={url}> link </a>
      {' '}
      .
    </p>
    {

    }
    <Image
      src="https://canadasdigitaltwin.ca/wp-content/uploads/2021/08/final-logo-animation-small-scale.mp4"
      alt="CDT logo"
    />
  </div>
)
