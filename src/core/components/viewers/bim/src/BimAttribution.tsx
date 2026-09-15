"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from "next-intl";
import * as React from "react";

import { useIsMobile } from "../../../../hooks/ui/use-mobile";

const ATTRIBUTIONS = [
    { name: "Three.js", url: "https://github.com/mrdoob/three.js" },
    { name: "That Open Company", url: "https://github.com/ThatOpen" },
    { name: "Potree", url: "https://github.com/potree/potree" },
    { name: "Sparks", url: "https://github.com/sparkjsdev/spark/" },
];

const MAPLIBRE_FONT = '12px/20px "Helvetica Neue", Arial, Helvetica, sans-serif';

// Core ships no Tailwind config, so every rule here is inline or scoped: a utility the consumer never uses is never generated.
const LINK_STYLES = `
.cdt-bim-attrib a { color: rgb(0 0 0 / 0.75); text-decoration: none; }
.cdt-bim-attrib a:hover { color: inherit; text-decoration: underline; }
`;

export function BimAttribution() {
    const t = useTranslations("BimAttribution");
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div
            className="cdt-bim-attrib"
            style={{ position: "absolute", bottom: 10, right: 10, zIndex: 30, pointerEvents: "auto" }}
        >
            <style>{LINK_STYLES}</style>
            <div
                style={{
                    position: "relative",
                    boxSizing: "content-box",
                    minHeight: 20,
                    borderRadius: 12,
                    backgroundColor: "#fff",
                    color: "#000",
                    font: MAPLIBRE_FONT,
                    padding: isOpen ? "2px 28px 2px 8px" : "2px 24px 2px 0",
                }}
            >
                {isOpen && (
                    <div style={{ whiteSpace: "nowrap" }}>
                        {!isMobile && `${t("poweredBy")} `}
                        {ATTRIBUTIONS.map((item, index) => (
                            <React.Fragment key={item.name}>
                                {index > 0 && " | "}
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    {item.name}
                                </a>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    title={t("toggle")}
                    aria-label={t("toggle")}
                    aria-expanded={isOpen}
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 24,
                        height: 24,
                        boxSizing: "border-box",
                        border: 0,
                        borderRadius: 12,
                        outline: "none",
                        cursor: "pointer",
                        backgroundColor: isOpen ? "rgb(0 0 0 / 0.05)" : "rgb(255 255 255 / 0.5)",
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 20 20" style={{ display: "block" }}>
                        <path
                            fillRule="evenodd"
                            d="M4 10a6 6 0 1 0 12 0 6 6 0 1 0-12 0m5-3a1 1 0 1 0 2 0 1 1 0 1 0-2 0m0 3a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}
