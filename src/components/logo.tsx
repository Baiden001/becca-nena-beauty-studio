import Image from "next/image";

export function Logo({
  size = 28,
  light = false,
}: {
  size?: number;
  /** White version, for sitting on top of the hero image or video. */
  light?: boolean;
}) {
  return (
    <Image
      src="/images/logo.png"
      alt=""
      width={size}
      height={size * 1.58}
      style={{ height: size * 1.58, width: "auto" }}
      className={light ? "brightness-0 invert" : undefined}
      priority
    />
  );
}
