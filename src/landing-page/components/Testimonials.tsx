import quoteIcon from "../../client/static/landing/quote-icon.svg";

interface Testimonial {
  name: string;
  role: string;
  avatarSrc: string;
  quote: string;
}

export default function Testimonials({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  return (
    <div className="mx-auto my-16 flex max-w-7xl flex-col items-center gap-[24px] px-4 md:px-6 sm:my-24 sm:gap-[40px]  md:my-32 ">
      <div className="flex flex-col items-center gap-[12px] text-center">
        <h2 className="text-[26px] font-semibold leading-[1.2] tracking-[0.44px] text-[#0a0f14] sm:text-[36px] md:text-[44px] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
          What Our Users Say
        </h2>
        <p className="max-w-[530px] text-[14px] leading-[1.6] text-[#7c7f85] sm:text-[16px] dark:text-muted-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
          PackMyCode is growing, and early sellers are building their profiles as the marketplace expands. Here's what success can look like:
        </p>
      </div>

      <div className="flex w-full flex-col gap-[16px] sm:gap-[20px] md:flex-row">
        {testimonials.map((testimonial, idx) => (
          <div
            key={idx}
            className="flex flex-1 flex-col justify-between rounded-[16px] border border-[#eee4dd] bg-[#f8f4f1] p-[20px] sm:p-[30px] dark:border-border dark:bg-card"
          >
            <div className="flex flex-col gap-[16px] sm:gap-[20px]">
              <img src={quoteIcon} alt="" className="h-[20px] w-[24px] sm:h-[24px] sm:w-[29px]" />
              <p className="text-[14px] font-medium leading-[1.5] tracking-[0.15px] text-[#0a0f14] sm:text-[15px] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
                {testimonial.quote}
              </p>
            </div>

            <div className="mt-auto flex items-center gap-[12px] pt-[16px] sm:gap-[14px] sm:pt-[20px]">
              <img
                src={testimonial.avatarSrc}
                loading="lazy"
                alt={`${testimonial.name}'s avatar`}
                className="h-[36px] w-[36px] rounded-full object-cover sm:h-[40px] sm:w-[40px]"
              />
              <div className="flex flex-col gap-[2px]">
                <p className="text-[14px] font-medium leading-[1.5] tracking-[0.16px] text-[#070d17] sm:text-[16px] dark:text-foreground" style={{ fontFamily: "'Aeonik', 'Inter', sans-serif" }}>
                  {testimonial.name}
                </p>
                <p className="text-[12px] leading-none text-[#535353] sm:text-[14px] dark:text-muted-foreground">
                  {testimonial.role}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
