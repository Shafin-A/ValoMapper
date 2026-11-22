import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProfileActionsRowProps {
  isEditing: boolean;
  isRSOUser: boolean;
  isUpdatingUser: boolean;
  currentName: string;
  currentUserName: string;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onLogout: () => void;
}

export const ProfileActionsRow = ({
  isEditing,
  isRSOUser,
  isUpdatingUser,
  currentName,
  currentUserName,
  onStartEdit,
  onSave,
  onCancel,
  onLogout,
}: ProfileActionsRowProps) => {
  const t = useTranslations("profile");

  return (
    <div className="flex gap-2 pt-4">
      {!isEditing ? (
        <>
          {!isRSOUser && (
            <Button onClick={onStartEdit} className="flex-1">
              {t("editProfile")}
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onLogout}
                  variant="outline"
                  size="icon"
                  aria-label={t("logOut")}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("logOut")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      ) : (
        <>
          <Button
            onClick={onSave}
            disabled={
              isUpdatingUser ||
              !currentName.trim() ||
              currentName.trim() === currentUserName
            }
            className="flex-1"
          >
            {isUpdatingUser ? t("saving") : t("save")}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isUpdatingUser}
          >
            {t("cancel")}
          </Button>
        </>
      )}
    </div>
  );
};
