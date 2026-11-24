'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import type { TourSection, TourSections } from './tourTypes'

type Translate = ReturnType<typeof useTranslations>
type SectionStep = TourSection['steps'][number]

interface Match { section: TourSection; step: SectionStep; index: number }

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase()

function matchesOf(list: TourSection[], query: string): Match[] {
  const needle = fold(query.trim())
  if (!needle) return []
  return list.flatMap(section => section.steps
    .map((step, index) => ({ section, step, index }))
    .filter(({ step }) => fold(`${step.title} ${section.title}`).includes(needle)))
}

interface StepRowProps { number?: number; title: string; detail?: string; here: boolean; hereLabel: string; onClick: () => void }

function StepRow({ number, title, detail, here, hereLabel, onClick }: StepRowProps) {
  return (
    <li>
      <button type="button" className="cdt-tour-section-step" aria-current={here ? 'step' : undefined} onClick={onClick}>
        {number !== undefined && <span className="cdt-tour-section-number" aria-hidden>{number}</span>}
        <span className="cdt-tour-section-text">
          <span>{title}</span>
          {detail && <small>{detail}</small>}
        </span>
        {here && <span className="cdt-tour-section-badge">{hereLabel}</span>}
        <span className="cdt-tour-item-go" aria-hidden>›</span>
      </button>
    </li>
  )
}

interface SectionStepsProps { section: TourSection; isHere: (section: TourSection, stepId: string) => boolean; onPick: (section: TourSection, stepId: string) => void; t: Translate }

function SectionSteps({ section, isHere, onPick, t }: SectionStepsProps) {
  return (
    <>
      <div className="cdt-tour-sections-intro">
        <div>
          <h3>{section.title}</h3>
          {section.description && <p>{section.description}</p>}
        </div>
        <button type="button" className="cdt-tour-next" onClick={() => onPick(section, section.steps[0].id)}>{t('start')}</button>
      </div>
      <ol className="cdt-tour-sections-list">
        {section.steps.map((step, i) => (
          <StepRow key={step.id} number={i + 1} title={step.title} here={isHere(section, step.id)} hereLabel={t('here')} onClick={() => onPick(section, step.id)} />
        ))}
      </ol>
    </>
  )
}

interface MatchesProps { matches: Match[]; isHere: SectionStepsProps['isHere']; onPick: SectionStepsProps['onPick']; t: Translate }

function Matches({ matches, isHere, onPick, t }: MatchesProps) {
  return (
    <>
      <p className="cdt-tour-sections-count" role="status">{t('matches', { count: matches.length })}</p>
      <ol className="cdt-tour-sections-list">
        {matches.map(({ section, step, index }) => (
          <StepRow
            key={`${section.id}:${step.id}`}
            title={step.title}
            detail={t('result', { section: section.title, step: index + 1 })}
            here={isHere(section, step.id)}
            hereLabel={t('here')}
            onClick={() => onPick(section, step.id)}
          />
        ))}
      </ol>
    </>
  )
}

interface SectionNavProps { list: TourSection[]; selected: string | undefined; current: string; onSelect: (id: string) => void; t: Translate }

function SectionNav({ list, selected, current, onSelect, t }: SectionNavProps) {
  return (
    <nav aria-label={t('tours')}>
      {list.map(section => (
        <button key={section.id} type="button" className="cdt-tour-section" aria-current={section.id === selected ? 'true' : undefined} onClick={() => onSelect(section.id)}>
          <span className="cdt-tour-section-text">
            <strong>{section.title}</strong>
            <small>{t('steps', { count: section.steps.length })}</small>
          </span>
          {section.id === current && <span className="cdt-tour-section-dot"><span className="cdt-tour-sr">{t('here')}</span></span>}
        </button>
      ))}
    </nav>
  )
}

interface TourSectionsDialogProps {
  sections: TourSections
  currentStep: string
  onPick: (section: TourSection, stepId: string) => void
  onBack: () => void
}

/** Every section of a tour and its steps, searchable, to jump to any of them; Back returns to the open step. */
export function TourSectionsDialog({ sections, currentStep, onPick, onBack }: TourSectionsDialogProps) {
  const t = useTranslations('GuidedTour.sections')
  const titleId = React.useId()
  const [list] = React.useState(() => sections.list().filter(section => section.steps.length > 0))
  const current = list.find(section => section.id === sections.current)
  const [selectedId, setSelectedId] = React.useState(() => current?.id ?? list[0]?.id)
  const [query, setQuery] = React.useState('')
  const searchRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => searchRef.current?.focus({ preventScroll: true }), [])

  const matches = React.useMemo(() => matchesOf(list, query), [list, query])
  const selected = list.find(section => section.id === selectedId)
  const currentIndex = current ? current.steps.findIndex(step => step.id === currentStep) : -1
  const isHere = (section: TourSection, stepId: string) => section.id === sections.current && stepId === currentStep
  const select = (id: string) => {
    setSelectedId(id)
    setQuery('')
  }

  return (
    <div className="cdt-tour-sections" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={event => event.key === 'Escape' && onBack()}>
      <header>
        <button type="button" className="cdt-tour-sections-back" onClick={onBack}><ArrowLeft aria-hidden />{t('back')}</button>
        <h2 id={titleId}>{t('title')}</h2>
        {current && currentIndex >= 0 && <small>{t('location', { section: current.title, step: currentIndex + 1 })}</small>}
      </header>
      <div className="cdt-tour-sections-search">
        <input ref={searchRef} type="search" aria-label={t('search')} placeholder={t('searchPlaceholder')} value={query} onChange={event => setQuery(event.target.value)} />
      </div>
      <div className="cdt-tour-sections-body">
        <SectionNav list={list} selected={query.trim() ? undefined : selectedId} current={sections.current} onSelect={select} t={t} />
        <div className="cdt-tour-sections-steps">
          {query.trim()
            ? <Matches matches={matches} isHere={isHere} onPick={onPick} t={t} />
            : selected && <SectionSteps section={selected} isHere={isHere} onPick={onPick} t={t} />}
        </div>
      </div>
    </div>
  )
}
