import * as LR from "lucide-react";
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          title={item.tooltip}
          className={`text-xs flex items-center gap-2 w-full ${
            isCollapsed ? "justify-center p-2" : "justify-start p-2"
          }`}
        >
          <LR.LifeBuoy className="h-4 w-4" />
          {!isCollapsed && <span>{item.title}</span>}
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() =>
            window.open(
              "mailto:support@collabdt.org?subject=Support Request",
              "_self"
            )
          }
        >
          <LR.Send className="mr-2 h-4 w-4" />
          Contact Team
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onOpenFeature}>
          <LR.SquarePlus className="mr-2 h-4 w-4" />
          Suggest Feature
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onOpenBug}>
          <LR.Bug className="mr-2 h-4 w-4" />
          Report Bug
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}