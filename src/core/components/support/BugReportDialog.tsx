"use client";

import * as LR from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { useCaptureScreenshot } from "../../hooks/useCaptureScreenshot";
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
  const getPosition = useCurrentViewerPosition();
  const getShareUrl = useShareUrl();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [repro, setRepro] = React.useState("");
  const [screenshot, setScreenshot] = React.useState<string | null>(null);
  // Holds a just-captured image pending the user's confirmation — not
  // attached to the report until they explicitly accept it via `OK`.
  const [previewScreenshot, setPreviewScreenshot] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [capturing, setCapturing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const errorRef = React.useRef<HTMLParagraphElement>(null);

  // The dialog body scrolls (max-h-[90vh]); on a short mobile viewport the
  // preview OR the error message can render below whatever's currently in
  // view with nothing to bring it on-screen automatically — a big desktop
  // viewport just happens to fit everything so this never showed up there.
  React.useEffect(() => {
    if (previewScreenshot) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [previewScreenshot]);

  React.useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setRepro("");
    setScreenshot(null);
    setPreviewScreenshot(null);
    setError(null);
  };

  const capture = async () => {
    setCapturing(true);
    setError(null);
    try {
      const img = await captureScreenshot();
      if (img) {
        setPreviewScreenshot(img);
      } else {
        setError('Screenshot failed — the image came back empty.');
      }
    } catch (err) {
      setError(`Screenshot failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCapturing(false);
    }
  };

  const confirmScreenshot = () => {
    setScreenshot(previewScreenshot);
    setPreviewScreenshot(null);
  };

  const retakeScreenshot = () => {
    setPreviewScreenshot(null);
  };

  const submit = async () => {
    if (!title.trim()) return;
    try {
      setLoading(true);
      setError(null);

      const shareUrl = await getShareUrl();
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
            <Button onClick={capture} variant="secondary" disabled={loading || capturing}>
              <LR.Camera className="h-4 w-4 mr-1" />
              {capturing ? t("capturing") : t("captureScreenshot")}
            </Button>
            {screenshot && !previewScreenshot && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <LR.CheckCircle className="h-3 w-3 text-green-500" />
                {t("screenshotAttached")}
              </span>
            )}
          </div>

          {previewScreenshot && (
            <div ref={previewRef} className="flex flex-col gap-2 rounded border p-2">
              <p className="text-sm font-medium">{t("screenshotPreviewTitle")}</p>
              <img
                src={previewScreenshot}
                alt="screenshot preview"
                className="w-full h-auto rounded border object-contain max-h-[60vh]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={retakeScreenshot}>
                  {t("retake")}
                </Button>
                <Button onClick={confirmScreenshot}>
                  <LR.Check className="h-4 w-4 mr-1" />
                  {t("attachScreenshot")}
                </Button>
              </div>
            </div>
          )}

          {screenshot && !previewScreenshot && (
            <img
              src={screenshot}
              alt="screenshot preview"
              className="w-full h-auto rounded border max-h-40 object-contain"
            />
          )}

          {error && (
            <p ref={errorRef} className="text-sm text-destructive">{error}</p>
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
