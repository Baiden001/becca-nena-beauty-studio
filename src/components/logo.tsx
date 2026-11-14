
import Image from "next/image";

export function Logo({
  size = 46,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <Image
      src="/images/logo.png"
      alt="Becca Nena Beauty Studio"
      width={size}
      height={size}
      style={{
        height: size,
        width: "auto",
        objectFit: "contain",
      }}
      className={light ? "brightness-0 invert" : undefined}
      priority
    />
  );
}

