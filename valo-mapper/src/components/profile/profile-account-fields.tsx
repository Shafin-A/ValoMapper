import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChangeEvent } from "react";

interface ProfileAccountFieldsProps {
  user: User;
  name: string;
  isRSOUser: boolean;
  isEditing: boolean;
  isUpdatingUser: boolean;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCopyFirebaseUid: () => void;
}

export const ProfileAccountFields = ({
  user,
  name,
  isRSOUser,
  isEditing,
  isUpdatingUser,
  onNameChange,
  onCopyFirebaseUid,
}: ProfileAccountFieldsProps) => {
  const t = useTranslations("profile");

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            value={name}
            onChange={onNameChange}
            disabled={isRSOUser || !isEditing || isUpdatingUser}
            placeholder={t("namePlaceholder")}
          />
          {isRSOUser && (
            <p className="text-xs text-muted-foreground">
              {t("managedByRso")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            value={user.email || ""}
            disabled
            className="bg-muted"
          />
          {isRSOUser && (
            <p className="text-xs text-muted-foreground">
              {t("emailManagedByRso")}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="firebase-uid">{t("uid")}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="firebase-uid"
            value={user.firebaseUid || ""}
            disabled
            className="bg-muted font-mono text-xs"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={onCopyFirebaseUid}
            disabled={!user.firebaseUid}
            aria-label={t("copyUid")}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("uidHelp")}</p>
      </div>
    </>
  );
};
