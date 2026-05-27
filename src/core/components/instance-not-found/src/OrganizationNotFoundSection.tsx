'use client'

import { motion } from 'framer-motion'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Input } from '../../ui/Input'
import { Textarea } from '../../ui/Textarea'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Footer from '../../ui/Footer'
import { useState } from 'react'

interface OrganizationNotFoundSectionProps {
  organizationName: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isSubmitting?: boolean
}

export default function OrganizationNotFoundSection({ 
  organizationName, 
  onSubmit, 
  isSubmitting = false
}: OrganizationNotFoundSectionProps) {
  const t = useTranslations('OrganizationNotFound')
  const [redirectOrg, setRedirectOrg] = useState('')

  const handleRedirect = () => {
    if (redirectOrg.trim()) {
      window.location.href = `/${redirectOrg.trim()}`
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
          {/* Header with Error Message */}
          <div className="text-center mb-16 space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-balance">{t('title')}</h1>
            <div className="text-lg space-y-2">
              <p className="text-muted-foreground">
                {t('organizationLabel')}{' '}
                <span className="font-semibold text-foreground">'{organizationName}'</span>{' '}
                {t('notCreatedYet')}
              </p>
              <div className="mt-6 mb-4">
                <p className="text-sm text-muted-foreground mb-3">{t('redirectPrompt')}</p>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-center max-w-md mx-auto">
                  <Input
                    value={redirectOrg}
                    onChange={(e) => setRedirectOrg(e.target.value)}
                    placeholder={t('redirectPlaceholder')}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleRedirect()
                      }
                    }}
                  />
                  <Button
                    onClick={handleRedirect}
                    variant="outline"
                    className="whitespace-nowrap"
                    disabled={!redirectOrg.trim()}
                  >
                    {t('redirectButton')}
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground">
                {t('contactMessage')}
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-stretch justify-center gap-4">
              <Link href="https://collabdt.org/">
                <Button variant="outline" size="lg" className="text-base px-8 w-full sm:w-auto">
                  {t('backToHome')}
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                className="text-base px-8 bg-primary-highlight border-secondary/40 hover:bg-orange-400 hover:border-secondary/60 transition-all whitespace-nowrap w-full sm:w-auto"
                asChild
              >
                <a href="https://docs.google.com/forms/d/e/1FAIpQLScB12Qc7khiOk4a_E753jDccx6026AjO-_FINBKoZZZtkmqnA/viewform" target="_blank" rel="noopener noreferrer">
                  {t('betaButton')}
                </a>
              </Button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 p-8">
              <h3 className="text-2xl font-bold mb-6">{t('formTitle')}</h3>
              <p className="text-muted-foreground mb-8">
                {t('formDescription')}
              </p>
              
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      {t('firstName')}
                    </label>
                    <Input 
                      id="firstName" 
                      name="firstName" 
                      required 
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      {t('lastName')}
                    </label>
                    <Input 
                      id="lastName" 
                      name="lastName" 
                      required 
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    {t('email')}
                  </label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    required 
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="organization" className="text-sm font-medium">
                    {t('organization')}
                  </label>
                  <Input 
                    id="organization" 
                    name="organization" 
                    defaultValue={organizationName}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    {t('message')}
                  </label>
                  <Textarea 
                    id="message" 
                    name="message" 
                    required 
                    rows={5}
                    className="bg-background resize-none"
                  />
                </div>

                <Button type="submit" size="lg" className="gradient-button w-full" disabled={isSubmitting}>
                  {isSubmitting ? t('sending') : t('sendButton')}
                </Button>

                <p className="text-sm text-muted-foreground text-center pt-2">
                  {t('orEmail')}{' '}
                  <a href="mailto:info@collabdt.org" className="text-primary hover:underline">
                    info@collabdt.org
                  </a>
                </p>
              </form>
            </Card>

            {/* Contact Info Card */}
            <div className="space-y-6">
              <Card className="p-6 hover-card">
                <h3 className="text-lg font-bold mb-3">{t('contactInfoTitle')}</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('emailLabel')}</p>
                    <a 
                      href="mailto:info@collabdt.org" 
                      className="text-primary hover:underline font-medium text-sm"
                    >
                      info@collabdt.org
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('websiteLabel')}</p>
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
                <h3 className="text-lg font-bold mb-3">{t('needHelpTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
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
