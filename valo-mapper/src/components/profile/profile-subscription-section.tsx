import { CheckoutPlanDialog } from "@/components/billing/checkout-plan-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProfileSubscriptionSectionProps {
  hasValoMapperPremium: boolean;
  hasScheduledCancellation: boolean;
  hasActivePremiumTrial: boolean;
  subscriptionBadgeText: string;
  subscriptionSummary: string;
  subscriptionStartedText?: string;
  isStackPlan: boolean;
  isStackMembersLoading: boolean;
  isActiveStackMember: boolean;
  isLeavingStack: boolean;
  isResumePending: boolean;
  isCancelPending: boolean;
  returnToPath: string;
  onLeaveActiveStack: () => void;
  onResumeSubscription: () => void;
  onCancelSubscription: () => void;
}

export const ProfileSubscriptionSection = ({
  hasValoMapperPremium,
  hasScheduledCancellation,
  hasActivePremiumTrial,
  subscriptionStartedText,
  subscriptionBadgeText,
  subscriptionSummary,
  isStackPlan,
  isStackMembersLoading,
  isActiveStackMember,
  isLeavingStack,
  isResumePending,
  isCancelPending,
  returnToPath,
  onLeaveActiveStack,
  onResumeSubscription,
  onCancelSubscription,
}: ProfileSubscriptionSectionProps) => {
  const t = useTranslations("profile.subscription");

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold">{t("title")}</div>
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <span className="text-sm">{t("premium")}</span>
        <span
          className={`text-xs font-semibold ${
            hasScheduledCancellation
              ? "text-amber-600"
              : hasActivePremiumTrial
                ? "text-emerald-700"
                : hasValoMapperPremium
                  ? "text-primary"
                  : "text-muted-foreground"
          }`}
        >
          {subscriptionBadgeText}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{subscriptionSummary}</p>
      {subscriptionStartedText && (
        <p className="text-xs text-muted-foreground">
          {subscriptionStartedText}
        </p>
      )}
      <div className="pt-1">
        {hasValoMapperPremium ? (
          isStackPlan && isStackMembersLoading ? (
            <p className="text-xs text-muted-foreground">
              {t("loadingPermissions")}
            </p>
          ) : isActiveStackMember ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLeavingStack}>
                  {isLeavingStack && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("leaveStack")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("leaveStackTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("leaveStackDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("stayInStack")}</AlertDialogCancel>
                  <AlertDialogAction onClick={onLeaveActiveStack}>
                    {t("leaveStack")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : hasScheduledCancellation ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onResumeSubscription}
              disabled={isResumePending}
            >
              {isResumePending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("undoCancel")}
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isCancelPending || isResumePending}
                >
                  {isCancelPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("cancelSubscription")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("cancelDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("keepSubscription")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onCancelSubscription}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/70"
                  >
                    {t("confirmCancel")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        ) : (
          <CheckoutPlanDialog
            returnToPath={returnToPath}
            trigger={<Button size="sm">{t("upgrade")}</Button>}
          />
        )}
      </div>
    </div>
  );
};
