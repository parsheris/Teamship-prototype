import { Image } from "@/components/ui/image"
import { BRAND_NAME, LOGO_RATIO_CLASS, LOGO_URL } from "@/lib/brand"

type LogoProps = {
  className?: string
  priority?: boolean
  sizes?: string
}

export function Logo({
  className = "",
  priority = false,
  sizes = "(max-width: 640px) 60vw, 320px",
}: LogoProps) {
  return (
    <div className={`${LOGO_RATIO_CLASS} ${className}`}>
      <Image
        src={LOGO_URL}
        alt={BRAND_NAME}
        priority={priority}
        sizes={sizes}
        className="logo-blend h-full w-full"
      />
    </div>
  )
}
