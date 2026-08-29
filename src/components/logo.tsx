import Image from "next/image";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/images/logo.png"
      alt=""
      width={size}
      height={size * 1.58}
      style={{ height: size * 1.58, width: "auto" }}
      priority
    />
  );
}
