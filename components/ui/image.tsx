import NextImage from "next/image"

type ImageProps = {
  src: string
  alt: string
  className?: string
  fittingType?: "fit" | "cover"
  priority?: boolean
  sizes?: string
}

export function Image({
  src,
  alt,
  className,
  fittingType = "fit",
  priority = false,
  sizes = "(max-width: 640px) 80vw, 400px",
}: ImageProps) {
  return (
    <NextImage
      src={src}
      alt={alt}
      width={600}
      height={160}
      sizes={sizes}
      priority={priority}
      unoptimized
      className={`${fittingType === "cover" ? "object-cover" : "object-contain"} ${
        className ?? ""
      }`}
    />
  )
}
