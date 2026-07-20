import * as LR from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/DropdownMenu";
import { SidebarMenuButton } from "../ui/Sidebar";

type Props = {
  item: any;
  isCollapsed: boolean;
  onOpenBug: () => void;
  onOpenFeature: () => void;
};

export function SupportMenu({
  item,
  isCollapsed,
  onOpenBug,
  onOpenFeature,
}: Props) {
  const t = useTranslations("supportMenu");
  const [menuOpen, setMenuOpen] = React.useState(false);

  const openDialogAfterMenuCloses = (callback: () => void) => {
    setMenuOpen(false);

    requestAnimationFrame(() => {
      callback();
    });
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          title={item.tooltip}
          className={`text-xs flex items-center gap-2 w-full ${isCollapsed ? "justify-center p-2" : "justify-start p-2"
            }`}
        >
          <LR.LifeBuoy className="h-4 w-4" />
          {!isCollapsed && <span>{item.title}</span>}
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onSelect={() =>
            window.open("https://collabdt.org/En/contact", "_blank")
          }
        >
          <LR.Send className="mr-2 h-4 w-4" />
          {t("contactTeam")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() =>
            openDialogAfterMenuCloses(onOpenFeature)
          }
        >
          <LR.SquarePlus className="mr-2 h-4 w-4" />
          {t("suggestFeature")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() =>
            openDialogAfterMenuCloses(onOpenBug)
          }
        >
          <LR.Bug className="mr-2 h-4 w-4" />
          {t("reportBug")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

