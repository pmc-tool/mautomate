export function Announcement() {
  return (
    <div className="relative flex w-full items-center justify-center gap-3 bg-gradient-to-r from-[#e6a556] to-[#bd6500] px-4 py-2.5 text-center text-sm font-medium text-white dark:from-accent dark:to-secondary dark:text-primary-foreground">
      <span className="hidden lg:inline">Support Open-Source Software!</span>
      <span className="hidden lg:inline text-white/60">|</span>
      <span className="font-semibold">50% Discount</span>
      <span className="lg:hidden">— Support Open-Source!</span>
    </div>
  );
}
