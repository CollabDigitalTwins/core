'use client'

import { Button } from './Button'
import { Separator } from './Separator'
import { Card, CardContent } from './Card'
import { File, Download } from 'lucide-react'

interface DescriptionListItemProps {
  label: string | React.JSX.Element
  children: React.ReactNode
  className?: string
}

export function DescriptionListItem({ label, children, className }: DescriptionListItemProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className={`text-sm text-muted-foreground ${className}`}>{children}</div>
    </div>
  )
}

export function DescriptionList() {
  return (
    <div className="bg-background">
      <div className="mx-auto p-6">
        <div className="flex flex-col md:flex-row items-start md:justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-semibold text-foreground">
              Application information
            </h2>
            <p className="text-sm text-muted-foreground">
              Personal details and general information
            </p>
          </div>
          <Button variant="outline">Edit</Button>
        </div>

        <div className="flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 py-5 md:py-6 border-t border-border">
            <DescriptionListItem label="Full name">
              Alex Thompson
            </DescriptionListItem>
            <Separator className="md:hidden" />
            <DescriptionListItem label="Email address">
              alex@example.com
            </DescriptionListItem>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 py-5 md:py-6 border-t border-border">
            <DescriptionListItem label="Address">
              123 Main Street, City, Country
            </DescriptionListItem>
            <Separator className="md:hidden" />
            <DescriptionListItem label="Phone number">
              +1 234 567 890
            </DescriptionListItem>
          </div>
          <div className="grid grid-cols-1 gap-5 md:gap-6 py-5 md:py-6 border-t border-border">
            <DescriptionListItem label="About">
              A seasoned software engineer with 5+ years of experience
              specializing in full-stack web development. Proven track record of
              delivering scalable solutions using React, Node.js, and cloud
              technologies. Strong focus on clean code architecture and
              performance optimization. Currently leading a team of 4 developers
              and actively mentoring junior engineers. Passionate about creating
              accessible and user-friendly applications.
            </DescriptionListItem>
          </div>
          <div className="grid grid-cols-1 gap-5 md:gap-6 py-5 md:py-6 border-t border-border">
            <DescriptionListItem label="Documents">
              <div className="flex flex-col md:flex-row gap-2 md:gap-6 w-full">
                <Card className="w-full">
                  <CardContent className="p-4 md:p-6 flex items-center gap-3">
                    <File className="w-4 h-4 text-foreground shrink-0" />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-card-foreground">
                          Resume.pdf
                        </span>
                      </div>
                      <Button variant="outline" className="hidden md:flex">
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="md:hidden"
                      >
                        <Download />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="w-full">
                  <CardContent className="p-4 md:p-6 flex items-center gap-3">
                    <File className="w-4 h-4 text-foreground shrink-0" />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-card-foreground">
                          Portfolio.pdf
                        </span>
                      </div>
                      <Button variant="outline" className="hidden md:flex">
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="md:hidden"
                      >
                        <Download />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DescriptionListItem>
          </div>
        </div>
      </div>
    </div>
  )
}
