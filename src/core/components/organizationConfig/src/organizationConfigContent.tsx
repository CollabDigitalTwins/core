'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Input } from '../../ui/Input'
import { Textarea } from '../../ui/Textarea'
import Footer from '../../ui/Footer'

export default function OrganizationConfigContent() {
  const t = useTranslations('OrganizationConfig')
  const router = useRouter()

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validateOrgName(name: string) {
  const regex = /^[a-z0-9.-]{3,63}$/
  return regex.test(name)
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setError(null)
    setLoading(true)
    
    
    const formData = new FormData(e.currentTarget)
    
    const orgLanguages = formData
      .getAll('orgLanguages')
      .map(String)

    const data = {
      orgName: formData.get('orgName'),
      orgTitle: formData.get('orgTitle'),
      orgDescription: formData.get('orgDescription'),
      orgLanguages,
      adminName: formData.get('adminName'),
      adminEmail: formData.get('adminEmail'),
      adminPassword: formData.get('adminPassword'),
    }

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        router.push(`/${data.orgName}/auth/signin`)
        return
      }

      setError(json.error ?? 'Failed to initialize instance.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="min-h-screen py-32 relative flex items-center z-10">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto"
          >
            <div className="text-center mb-16 space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold">
                {t('title')}
              </h1>

              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('description')}
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 p-8">
                <h3 className="text-2xl font-bold mb-6">
                  {t('setupTitle')}
                </h3>

                <p className="text-muted-foreground mb-8">
                  {t('setupDescription')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">

                {/* Org Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Organization Name / Slug
                  </label>
                  <Input
                  name="orgName"
                  placeholder="my-org"
                  required
                  minLength={3}
                  maxLength={63}
                  pattern="^[a-z0-9.-]+$"
                  />
                  <p className="text-xs text-muted-foreground">
                    3–63 characters. Lowercase letters, numbers, dots, and hyphens only.
                  </p>
                </div>

                {/* Org Title */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Organization Title
                  </label>
                  <Input
                    name="orgTitle"
                    placeholder="Organization Title"
                    required
                  />
                </div>

                {/* Org Description */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Organization Description
                  </label>
                  <Textarea
                    name="orgDescription"
                    placeholder="Organization Description"
                    rows={4}
                    required
                  />
                </div>

                {/* Languages */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Languages
                  </label>

                  <select
                    name="orgLanguages"
                    multiple
                    defaultValue={['En']}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
                  >
                    <option value="En">English</option>
                    <option value="Fr">French</option>
                    <option value="Es">Spanish</option>
                  </select>

                  <p className="text-xs text-muted-foreground">
                    Hold Ctrl (Windows) / Cmd (Mac) to select multiple languages
                  </p>
                </div>

                {/* Admin Section */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-4">
                    Administrator Account
                  </h4>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        Admin Name
                      </label>
                      <Input
                        name="adminName"
                        placeholder="Admin Name"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        Admin Email
                      </label>
                      <Input
                        name="adminEmail"
                        type="email"
                        placeholder="admin@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <label className="text-sm font-medium">
                      Password
                    </label>
                    <Input
                      name="adminPassword"
                      type="password"
                      placeholder="Password"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="gradient-button w-full"
                  disabled={loading}
                >
                  {loading ? 'Initializing Instance...' : 'Initialize Instance'}
                </Button>
              </form>
              </Card>

              <div className="space-y-6">
              <Card className="p-6 hover-card">
                <h3 className="text-lg font-bold mb-3">
                  {t('contactInfoTitle')}
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('emailLabel')}
                    </p>

                    <a
                      href="mailto:info@collabdt.org"
                      className="text-primary hover:underline font-medium text-sm"
                    >
                      info@collabdt.org
                    </a>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('websiteLabel')}
                    </p>

                    <a
                      href="https://collabdt.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium text-sm"
                    >
                      collabdt.org
                    </a>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover-card bg-primary/5 border-primary/20">
                <h3 className="text-lg font-bold mb-3">
                  {t('needHelpTitle')}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {t('needHelpDescription')}
                </p>
              </Card>
            </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  )
}