import { useEffect, useRef, useState } from "react";

interface AnimatedContentProps {
  show: boolean;
  children: React.ReactNode;
}

export const AnimatedContent = ({ show, children }: AnimatedContentProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [render, setRender] = useState(show);

  useEffect(() => {
    if (show) {
      setRender(true);
    }
  }, [show]);

  const onAnimationEnd = () => {
    if (!show) {
      setRender(false);
    }
  };

  return render ? (
    <div
      ref={ref}
      data-state={show ? "open" : "closed"}
      onAnimationEnd={onAnimationEnd}
      style={{
        ["--content-height" as string]: `${ref.current?.scrollHeight || 220}px`,
      }}
      className="data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown overflow-hidden text-sm"
    >
      {children}
    </div>
  ) : null;
};
