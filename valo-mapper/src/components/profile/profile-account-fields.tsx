import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
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
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={onNameChange}
          disabled={isRSOUser || !isEditing || isUpdatingUser}
          placeholder="Your name"
        />
        {isRSOUser && (
          <p className="text-xs text-muted-foreground">
            Managed by Riot Sign-On. This name updates from your Riot Game Name
            and Tagline.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={user.email || ""}
          disabled
          className="bg-muted"
        />
        {isRSOUser && (
          <p className="text-xs text-muted-foreground">
            Email is managed by Riot Sign-On.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="firebase-uid">UID</Label>
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
            aria-label="Copy UID"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this UID with a stack owner so they can invite you.
        </p>
      </div>
    </>
  );
};
