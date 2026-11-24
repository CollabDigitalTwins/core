// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../../../types/dbTypes'

import { chromeOf, platformTourSteps } from './platformTourSteps'
import { dataPageOf, panelTabOf, subTour, visiblePanelTabs } from './subTourSteps'
import { pageTourOf, tourFits } from './tourRoutes'

import type { PlatformTourActions, PlatformTourId, TourAvailability, Translate, ViewerChrome } from './platformTourTypes'
import type { PluginTourEntries } from './usePluginTourEntries'
import type { Language, ViewerKey } from '../../../types/dbTypes'
import type { TourSection, TourStep } from '../tourTypes'

type SubTourId = Exclude<PlatformTourId, 'platform'>

export interface SectionContext {
  t: Translate
  a: PlatformTourActions
  viewer: ViewerKey | undefined
  plugins: PluginTourEntries
  available: TourAvailability
  languages: Language[]
}

/** The page a tour runs on, which jumping into the middle of it has to open first. */
export function pageOfTour(tour: PlatformTourId): ViewerKey | undefined {
  if (tour === 'map' || tour === 'bim' || tour === 'plugins' || tour === 'settings') return ViewerNames[tour]
  const page = dataPageOf(tour)
  return page && ViewerNames[page]
}

const pageTours = (available: TourAvailability): SubTourId[] =>
  [...available.viewers, ...available.dataPages.map(page => `data-${page}` as const), 'plugins', 'settings']

const closerTours = (chrome: ViewerChrome, a: PlatformTourActions): SubTourId[] =>
  ['tools', 'datasets', 'measure', ...visiblePanelTabs(chrome, a).map(tab => `panel-${tab}` as const)]

function describe(tour: PlatformTourId, t: Translate, chrome: ViewerChrome): Pick<TourSection, 'title' | 'description'> {
  const page = dataPageOf(tour)
  if (page) return { title: t(`data.items.${page}.term`), description: t(`data.items.${page}.description`) }
  const tab = panelTabOf(tour)
  if (tab) {
    const title = t('sections.panelTab', { panel: t(`panelTabs.${chrome}.title`), tab: t(`panelTabs.items.${tab}.term`) })
    return { title, description: t(`panelTabs.items.${tab}.description`) }
  }
  switch (tour) {
    case 'platform': return { title: t('overviewShortcut') }
    case 'map':
    case 'bim': return { title: t(`viewerTour.${tour}.title`), description: t(`viewerTour.${tour}.body`) }
    case 'tools': return { title: t(`toolbar.${chrome}.title`) }
    case 'datasets': return { title: t('tools.map-database.title'), description: t('tools.map-database.body') }
    case 'measure': return { title: t('tools.map-measure.title'), description: t('tools.map-measure.body') }
    case 'plugins': return { title: t('plugins.title'), description: t('plugins.body') }
    case 'settings': return { title: t('settingsPage.sections.title'), description: t('account.items.settings.description') }
    default: return { title: tour }
  }
}

function stepsOf(tour: PlatformTourId, { t, a, viewer, plugins, available, languages }: SectionContext): TourStep[] {
  return tour === 'platform' ? platformTourSteps(t, a, { languages, available }) : subTour(tour, t, a, viewer, plugins, available).steps
}

/** The overview, every page's tour, and the closer tours of the page the viewer is on, in the order the guide visits them. */
export function tourSections(context: SectionContext, start: (tour: PlatformTourId, stepId: string) => void): TourSection[] {
  const { t, a, viewer, available } = context
  const chrome = chromeOf(viewer) ?? 'map'
  const here = pageTourOf(viewer, available)
  const closer = closerTours(chrome, a).filter(tour => tourFits(tour, viewer))
  const tours: PlatformTourId[] = ['platform', ...pageTours(available).flatMap(tour => (tour === here ? [tour, ...closer] : [tour]))]
  return tours.map(tour => ({
    id: tour,
    ...describe(tour, t, chrome),
    steps: stepsOf(tour, context).filter(s => !s.skip?.()).map(({ id, title }) => ({ id, title })),
    start: (stepId: string) => start(tour, stepId),
  }))
}
