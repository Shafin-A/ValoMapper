import { Separator } from "@radix-ui/react-separator";
import { Home, FolderOpen } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { CreateFolderPopover } from "./create-folder-popover";
import { useRouter } from "next/navigation";

interface StrategiesHeaderProps {
  navigationPath: { id: string; name: string }[];
  currentFolderId: number | null;
  refetch: () => void;
  navigateToBreadcrumb: (index: number) => void;
}

export const StrategiesHeader = ({
  navigationPath,
  currentFolderId,
  refetch,
  navigateToBreadcrumb,
}: StrategiesHeaderProps) => {
  const router = useRouter();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 mb-4 h-8">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            onClick={() => router.push("/")}
          >
            <Home className="size-8" />
          </Button>
          <Separator orientation="vertical" />
          <FolderOpen className="w-8 h-8" />
          <h1 className="text-3xl font-bold text-white">
            {navigationPath[navigationPath.length - 1].name}
          </h1>
        </div>
        <CreateFolderPopover
          parentFolderId={currentFolderId}
          onSuccess={refetch}
        />
      </div>

      <Breadcrumb>
        <BreadcrumbList>
          {navigationPath.map((crumb, index) => (
            <div key={crumb.id} className="contents">
              <BreadcrumbItem>
                {index === navigationPath.length - 1 ? (
                  <BreadcrumbPage className="font-medium">
                    {crumb.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => navigateToBreadcrumb(index)}
                    className="cursor-pointer"
                  >
                    {crumb.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < navigationPath.length - 1 && <BreadcrumbSeparator />}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};
