"use client"

// Dependencies
import { useRouter } from 'next/navigation'
import * as React from "react";
import { useTranslations, useLocale } from 'next-intl'

// Shadcn Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/DropdownMenu'
import { Button } from '../components/ui/Button'

// Icons
import { Languages } from 'lucide-react'
import { switchLanguage } from '../utils/utils';
import { Language } from '../types/dbTypes';

const LANGUAGE_OPTIONS: { lang: Language; labelKey: 'english' | 'french' | 'spanish' }[] = [
    { lang: Language.En, labelKey: 'english' },
    { lang: Language.Fr, labelKey: 'french' },
    { lang: Language.Es, labelKey: 'spanish' },
]

interface LanguageSwitchProps {
    showLabel?: boolean;
    variant?: 'ghost' | 'outline';
    languages?: Language[];
}

export default function LanguageSwitch({ showLabel, variant='ghost', languages }: LanguageSwitchProps) {

    // i18n
    const locale = useLocale()
    const router = useRouter()
    const [_, setCurrentLocale] = React.useState(locale)
    const t = useTranslations('LanguageSwitch')

    const effectiveLanguages = languages?.length ? languages : [Language.En]
    const options = effectiveLanguages
        .map(lang => LANGUAGE_OPTIONS.find(o => o.lang === lang))
        .filter(Boolean)

    React.useEffect(() => {
        if (!effectiveLanguages.includes(locale as Language)) {
            switchLanguage(effectiveLanguages[0], setCurrentLocale, router)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    if (options.length <= 1) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button 
                variant={variant} 
                size={showLabel ? "default" : "icon"} 
                className={`text-xs ${showLabel ? 'w-full p-2 justify-start h-auto' : ''}`}
                title={t('tooltip')}
            >
                <Languages />
                {showLabel &&
                <span>{t('languageLabel')}</span>
                }
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
            {options.map(({ lang, labelKey }) => (
                <DropdownMenuItem
                    key={lang}
                    onClick={() => switchLanguage(lang, setCurrentLocale, router)}
                >
                    {t(labelKey)}
                </DropdownMenuItem>
            ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}