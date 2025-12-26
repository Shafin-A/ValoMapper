import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROLE_ICONS } from "@/lib/consts";
import { Grid3x3 } from "lucide-react";
import Image from "next/image";

interface RoleTabsProps {
  selectedRole: string;
  onRoleChange: (role: string) => void;
}

export const roleTabs = [
  { value: "All", label: "All" },
  { value: "Duelist", label: "Duelist" },
  { value: "Controller", label: "Controller" },
  { value: "Initiator", label: "Initiator" },
  { value: "Sentinel", label: "Sentinel" },
];

export const RoleTabs: React.FC<Pick<RoleTabsProps, "selectedRole">> = ({
  selectedRole,
}) => {
  return (
    <TabsList className="flex justify-between gap-2 mb-4 w-full rounded-none">
      {roleTabs.map((tab) => {
        const isSelected = tab.value === selectedRole;
        let icon: React.ReactNode;

        if (tab.value === "All") {
          icon = (
            <div className="w-7 h-7 flex items-center justify-center">
              <Grid3x3
                className="size-6.5!"
                strokeWidth={2.5}
                color="#fff"
                style={{ opacity: isSelected ? 1 : 0.5 }}
              />
            </div>
          );
        } else {
          const src = ROLE_ICONS[tab.value];
          icon = src ? (
            <div className="w-7 h-7 flex items-center justify-center">
              <Image
                src={src}
                alt={tab.value}
                width={24}
                height={24}
                style={{ opacity: isSelected ? 1 : 0.5 }}
              />
            </div>
          ) : (
            <span className="w-8 h-8 bg-gray-300 rounded" />
          );
        }

        return (
          <Tooltip key={tab.value} delayDuration={700}>
            <TooltipTrigger asChild>
              <TabsTrigger
                value={tab.value}
                className="flex flex-col items-center gap-1 p-2 transition-all hover:scale-105"
              >
                {icon}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              {`${tab.label}${tab.label === "All" ? "" : "s"}`}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </TabsList>
  );
};
