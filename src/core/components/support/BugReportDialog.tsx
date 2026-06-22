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

import * as LR from "lucide-react";

export function BugReportDialog({
  open,
  onOpenChange,
  onCaptureScreenshot,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCaptureScreenshot?: () => Promise<string | null>;
}) {
  const t = useTranslations("supportDialog");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [repro, setRepro] = React.useState("");
  const [screenshot, setScreenshot] = React.useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setRepro("");
    setScreenshot(null);
  };

  const capture = async () => {
    if (!onCaptureScreenshot) return;
    const img = await onCaptureScreenshot();
    setScreenshot(img);
  };

  const submit = async () => {
    await fetch("/api/github-issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        type: "bug",
        labels: ["bug"],
        meta: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          viewer: "Map",
        },
      }),
    });

    reset();
    onOpenChange(false);
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
            placeholder={t("bugTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            placeholder={t("descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Textarea
            placeholder={t("descriptionPlaceholder")}
            value={repro}
            onChange={(e) => setRepro(e.target.value)}
          />

          <div className="flex gap-2 items-center">
            <Button onClick={capture} variant="secondary">
              Capture screenshot
            </Button>

            {screenshot && (
              <span className="text-sm text-muted-foreground">
                Screenshot attached ✓
              </span>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
            >
                {t("cancel")}
            </Button>

            <Button onClick={submit}>
                {t("submit")}
            </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}