import Image from "next/image";

type EarPulseLogoProps = {
  size?: "sm" | "md" | "lg";
  muted?: boolean;
  animate?: boolean;
};

const sizeMap = {
  sm: "h-16 w-24",
  md: "h-24 w-36",
  lg: "h-32 w-52",
};

export function EarPulseLogo({ size = "md", muted = false, animate = false }: EarPulseLogoProps) {
  const src = size === "lg" ? "/media/Laag 3.svg" : "/media/Laag 4.svg";

  return (
    <div
      className={`${sizeMap[size]} ${animate ? "logo-pulse" : ""} ${muted ? "opacity-55 grayscale" : ""}`}
      aria-hidden="true"
    >
      <Image src={src} alt="" width={305} height={269} className="h-full w-full object-contain" priority={size === "lg"} />
    </div>
  );
}