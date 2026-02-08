import Image from "next/image";

export default function Logo() {
  return (
    <div className="relative h-max w-auto">
      {/* Using CSS filters for a single SVG logo to support dark mode.
         If you have two separate files, use the 'hidden dark:block' pattern.
      */}
      <Image
        src="/logo.svg"
        alt="Camp Registration Logo"
        width={300}
        height={90}
        className="h-10 w-auto object-contain dark:invert"
        priority
      />
    </div>
  );
}
