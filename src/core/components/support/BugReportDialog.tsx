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
import { Textarea } from "../ui/Textarea";
import { Input } from "../ui/Input";
import { useCaptureScreenshot } from "../../hooks/useCaptureScreenshot";

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

export function BugReportDialog({
  open,
  onOpenChange,
  userEmail,
  viewer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userEmail?: string;
  viewer?: string;
}) {
  const t = useTranslations("supportDialog");
  const captureScreenshot = useCaptureScreenshot();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [repro, setRepro] = React.useState("");
  const [screenshot, setScreenshot] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setRepro("");
    setScreenshot(null);
    setError(null);
  };

  const capture = async () => {
    const img = await captureScreenshot();
    setScreenshot(img);
  };

  const submit = async () => {
    if (!title.trim()) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/github-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          repro,
          screenshot,
          type: "bug",
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }

      reset();
      onOpenChange(false);
      toast.success(t("submitSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
            <LR.Bug className="h-5 w-5" />
            {t("bugTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder={t("bugTitlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            placeholder={t("descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Textarea
            placeholder={t("reproPlaceholder")}
            value={repro}
            onChange={(e) => setRepro(e.target.value)}
          />

          <div className="flex gap-2 items-center">
            <Button onClick={capture} variant="secondary" disabled={loading}>
              <LR.Camera className="h-4 w-4 mr-1" />
              {t("captureScreenshot")}
            </Button>
            {screenshot && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <LR.CheckCircle className="h-3 w-3 text-green-500" />
                {t("screenshotAttached")}
              </span>
            )}
          </div>

          {screenshot && (
            <img
              src={screenshot}
              alt="screenshot preview"
              className="w-full h-auto rounded border max-h-40 object-contain"
            />
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

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
              disabled={!title.trim() || loading}
            >
              {loading ? "..." : t("submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
