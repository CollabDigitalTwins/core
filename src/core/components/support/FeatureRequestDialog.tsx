"use client";

import * as LR from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { useCurrentViewerPosition } from "../../hooks/useCurrentViewerPosition";
import { useShareUrl } from "../../hooks/useShareUrl";
import { Button } from "../ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";



function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if ("userAgentData" in navigator) {
    const uaData = (navigator as any).userAgentData;
    const brands: Array<{ brand: string; version: string }> = uaData.brands ?? [];
    const brand =
      brands.find((b) => !b.brand.includes("Not") && b.brand !== "Chromium") ??
      brands[0];
    const name = brand?.brand ?? "Unknown";
    const version = brand?.version ?? "";
    return version ? `${name} ${version}` : name;
  }
  const checks: Array<[string, RegExp]> = [
    ["Firefox", /Firefox\/(\d+)/],
    ["Edge", /Edg\/(\d+)/],
    ["Chrome", /Chrome\/(\d+)/],
    ["Safari", /Version\/(\d+).*Safari/],
  ];
  for (const [name, re] of checks) {
    const m = re.exec(ua);
    if (m) return `${name} ${m[1]}`;
  }
  return "Unknown";
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;

  // Mobile
  if (/iPhone/i.test(ua)) {
    return "Mobile - iPhone";
  }

  if (/Android/i.test(ua) && /Mobile/i.test(ua)) {
    return "Mobile - Android";
  }

  // Tablets
  if (/iPad/i.test(ua)) {
    return "Tablet - iPad";
  }

  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
    return "Tablet - Android";
  }

  // Desktop OS
  if (/Windows NT/i.test(ua)) {
    return "Desktop - Windows";
  }

  if (/Macintosh|Mac OS X/i.test(ua)) {
    return "Desktop - macOS";
  }

  if (/CrOS/i.test(ua)) {
    return "Desktop - ChromeOS";
  }

  if (/Linux/i.test(ua)) {
    return "Desktop - Linux";
  }

  return "Unknown";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
  viewer?: string;
};

export function FeatureRequestDialog({ open, onOpenChange, userEmail, viewer }: Props) {
  const t = useTranslations("supportDialog");
  const getPosition = useCurrentViewerPosition();
  const getShareUrl = useShareUrl();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) return;

    try {
      setLoading(true);

      const shareUrl = await getShareUrl();
      await fetch("/api/github-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type: "feature-request",
          labels: ["users"],
          meta: {
            url: shareUrl,
            userAgent: navigator.userAgent,
            browser: getBrowserInfo(),
            device: getDeviceInfo(),
            timestamp: new Date().toISOString(),
            viewer,
            userEmail,
            position: getPosition(),
          },
        }),
      });

      reset();
      onOpenChange(false);
      toast.success(t("featureSubmitSuccess"));
    } catch (err) {
      console.error("Feature request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LR.SquarePlus className="h-5 w-5" />
            {t("featureTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Input
            placeholder={t("featureTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            placeholder={t("descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />

          <div className="text-sm text-muted-foreground"> {t("wantToBuild")}{" "}
            <a href="https://docs.collabdt.org/docs/plugins/overview" target="_blank" rel="noreferrer" className="underline hover:text-foreground" >
            {t("pluginDocumentation")}
             </a>
            </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("cancel")}
            </Button>

            <Button
              onClick={submit}
              disabled={!title.trim() || !description.trim() || loading}
            >
              {loading ? "..." : t("submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}