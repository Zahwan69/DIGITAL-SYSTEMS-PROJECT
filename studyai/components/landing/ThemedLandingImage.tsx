import Image from "next/image";

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
  void darkSrc;

  return (
    <div className={cn(className)}>
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        priority={priority}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
