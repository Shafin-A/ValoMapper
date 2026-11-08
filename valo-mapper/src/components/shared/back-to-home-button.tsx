import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackToHomeButtonProps {
  className?: string;
}

export const BackToHomeButton = ({ className }: BackToHomeButtonProps) => (
  <Button
    asChild
    variant="ghost"
    size="sm"
    className={cn("-ml-2 text-white/60 hover:text-white", className)}
  >
    <Link href="/" aria-label="Back to ValoMapper">
      <ArrowLeft />
      Back to ValoMapper
    </Link>
  </Button>
);
