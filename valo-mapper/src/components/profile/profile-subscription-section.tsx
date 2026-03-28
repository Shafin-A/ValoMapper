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
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold">Subscription</div>
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <span className="text-sm">ValoMapper Premium</span>
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
              Loading stack billing permissions...
            </p>
          ) : isActiveStackMember ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLeavingStack}>
                  {isLeavingStack && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Leave Stack
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave this stack?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will lose Premium Stack access immediately after leaving
                    unless you have your own active personal subscription.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Stay in Stack</AlertDialogCancel>
                  <AlertDialogAction onClick={onLeaveActiveStack}>
                    Leave Stack
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
              Undo Cancellation
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
                  Cancel Subscription
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your subscription will be set to cancel at the end of your
                    current billing period. You will keep ValoMapper Premium
                    access until then.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onCancelSubscription}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/70"
                  >
                    Confirm Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        ) : (
          <CheckoutPlanDialog
            returnToPath={returnToPath}
            trigger={<Button size="sm">Upgrade to Premium</Button>}
          />
        )}
      </div>
    </div>
  );
};
