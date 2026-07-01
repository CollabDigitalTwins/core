"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/Dialog";

import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

import * as LR from "lucide-react";
import { toast } from "sonner";

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
  if ("userAgentData" in navigator) {
    return (navigator as any).userAgentData?.mobile ? "Mobile" : "Desktop";
  }
  return /Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent)
    ? "Mobile"
    : "Desktop";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string;
  viewer?: string;
};

export function FeatureRequestDialog({ open, onOpenChange, userEmail, viewer }: Props) {
  const t = useTranslations("supportDialog");

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

      await fetch("/api/github-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type: "feature-request",
          labels: ["users"],
          meta: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            browser: getBrowserInfo(),
            device: getDeviceInfo(),
            timestamp: new Date().toISOString(),
            viewer,
            userEmail,
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