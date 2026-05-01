"use client"

import * as LR from 'lucide-react'

import { Separator } from '../../ui/'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '../../ui/Breadcrumb'
import { SidebarTrigger } from '../../ui/Sidebar'

type SettingsHeaderProps = {
  title: string
}

export default function SettingsHeader({ title }: SettingsHeaderProps) {
  return (
    <div>
      <div className="flex flex-row gap-2 justify-start items-center px-3 py-4 relative">
        <SidebarTrigger />

        <Separator orientation="vertical" className="h-4" />

        <Breadcrumb className="px-3">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-row justify-between items-center px-6 py-6">
        <div className="flex flex-row justify-center items-center gap-4">
          <LR.Settings />
          <h1 className="text-2xl text-foreground">{title}</h1>
        </div>
      </div>

      <Separator />
    </div>
  )
}
