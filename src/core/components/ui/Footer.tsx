'use client'

import { useTranslations } from 'next-intl'

export default function Footer() {
  const tFooter = useTranslations('HomePage.footer')

  return (
    <footer
      className="relative"
      style={{ background: 'var(--hp-lowest)' }}
    >
      <div className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-5">
            <div
              className="font-display font-bold"
              style={{ fontSize: '1.05rem', letterSpacing: '-0.01em', color: 'var(--hp-on-surface)' }}
            >
              Collab Digital Twins
            </div>
            <p
              className="text-[0.9rem] leading-relaxed max-w-[220px]"
              style={{ color: 'var(--hp-on-surface-variant)' }}
            >
              {tFooter('description')}
            </p>
          </div>

          {/* Navigate */}
          <div className="space-y-5">
            <div className="section-label">Navigate</div>
            <ul className="space-y-3">
              {[
                { label: 'About', href: '#about' },
                { label: 'Contributors', href: '#contributors' },
                { label: 'Contact', href: '#contact' },
                { label: 'Platform', href: '/cdt' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-[0.9rem] transition-colors duration-150"
                    style={{
                      color: 'var(--hp-on-surface-variant)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--hp-on-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--hp-on-surface-variant)')}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-5">
            <div className="section-label">Resources</div>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLScB12Qc7khiOk4a_E753jDccx6026AjO-_FINBKoZZZtkmqnA/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors duration-150"
                  style={{ color: 'var(--hp-on-surface-variant)', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--hp-on-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--hp-on-surface-variant)')}
                >
                  Beta Access
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@collabdt.org"
                  className="text-sm transition-colors duration-150"
                  style={{ color: 'var(--hp-on-surface-variant)', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--hp-on-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--hp-on-surface-variant)')}
                >
                  info@collabdt.org
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-5">
            <div className="section-label">Legal</div>
            <ul className="space-y-3">
              <li>
                <p
                  className="text-[0.9rem] leading-relaxed"
                  style={{ color: 'var(--hp-on-surface-variant)' }}
                >
                  {tFooter('license')}
                </p>
              </li>
              {[
                { key: 'privacyPolicy', href: '/privacypolicy' },
                { key: 'cookiePolicy', href: '/cookiepolicy' },
              ].map(({ key, href }) => (
                <li key={key}>
                  <a
                    href={href}
                    className="text-[0.9rem] transition-colors duration-150"
                    style={{ color: 'var(--hp-on-surface-variant)', textDecoration: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--hp-on-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--hp-on-surface-variant)')}
                  >
                    {tFooter(key as any)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom row — spacing-only separation, no divider */}
        <div className="mt-20 flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
          <p className="text-xs" style={{ color: 'var(--hp-outline)' }}>
            {tFooter('stewardship')}
          </p>
          <p className="text-xs" style={{ color: 'var(--hp-outline)' }}>
            {new Date().getFullYear()} {tFooter('copyright')}
          </p>
        </div>
      </div>
    </footer>
  )
}
