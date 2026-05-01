import Image from 'next/image'
import * as React from 'react'

interface EmailTemplateProps {
  name: string
  url: string
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  name,
  url,
}) => (
  <div>
    <h1>Welcome to the Digital Twin Platform</h1>

    <p>
      Hi,
      {name}
      ,
      <br />
      Please verify your email by visiting this
      {' '}
      <a href={url}> link </a>
      {' '}
    </p>
    {

    }
    <Image
      src="https://canadasdigitaltwin.ca/wp-content/uploads/2021/08/final-logo-animation-small-scale.mp4"
      alt="CDT logo"
    />
  </div>
)
