"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

export function ThemedLandingImage({
  src,
  darkSrc,
  width,
  height,
  className,
  priority,
}: {
  src: string;
  darkSrc: string;
  width: number;
  height: number;
  className: string;
  priority?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const currentSrc = mounted && resolvedTheme === "dark" ? darkSrc : src;

  return (
    <div className={cn(className, "dark:opacity-90 dark:mix-blend-screen")}>
      <Image
        src={currentSrc}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        priority={priority}
        className="h-full w-full object-cover opacity-70"
      />
    </div>
  );
}
