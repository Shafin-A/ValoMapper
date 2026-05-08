import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface AnimatedContentProps {
  show: boolean;
  children: React.ReactNode;
}

export const AnimatedContent = ({ show, children }: AnimatedContentProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [render, setRender] = useState(show);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (show) {
      setRender(true);
    }
  }, [show]);

  useLayoutEffect(() => {
    if (!render || !ref.current) {
      return;
    }

    const element = ref.current;
    const updateHeight = () => {
      setContentHeight(element.scrollHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [render]);

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
        ["--content-height" as string]: `${contentHeight}px`,
      }}
      className="data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown overflow-hidden text-sm"
    >
      {children}
    </div>
  ) : null;
};
