import logo1 from "../../client/static/landing/logos/logo1.png";
import logo2 from "../../client/static/landing/logos/logo2.png";
import logo3 from "../../client/static/landing/logos/logo3.png";
import logo4 from "../../client/static/landing/logos/logo4.png";
import logo5 from "../../client/static/landing/logos/logo5.png";
import logo6a from "../../client/static/landing/logos/logo6a.png";
import logo7 from "../../client/static/landing/logos/logo7.png";

const logos = [
  { src: logo1, alt: "eastral", h: 27, w: 97 },
  { src: logo2, alt: "Planval", h: 37, w: 130 },
  { src: logo3, alt: "PACKMYCODE", h: 17, w: 147 },
  { src: logo4, alt: "QADONE", h: 20, w: 112 },
  { src: logo5, alt: "AdventGrabs", h: 30, w: 147 },
  { src: logo6a, alt: "beedoo", h: 23, w: 107 },
  { src: logo7, alt: "Company 7", h: 27, w: 91 },
];

export default function Clients() {
  return (
    <div className="mx-auto mt-0 flex max-w-[1200px] flex-col items-center px-4 pb-[14px] sm:px-6 lg:px-8">
      <p className="text-[15px] leading-[1.6] tracking-[-0.27px] text-[#707070] sm:text-[18px] dark:text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
        Trusted by{" "}
        <span className="font-semibold text-[#0a0f14] dark:text-foreground">50+ companies</span>
        {" "}of all sizes
      </p>

      {/* Mobile: horizontal scroll / Desktop: spread out */}
      <div className="-mx-4 mt-2 flex w-[calc(100%+2rem)] items-center gap-8 overflow-x-auto px-4 py-6 sm:mx-0 sm:mt-0 sm:w-full sm:flex-wrap sm:justify-center sm:gap-6 sm:overflow-x-visible sm:py-8 md:flex-nowrap md:justify-between md:gap-4 lg:gap-6">
        {logos.map((logo, i) => (
          <div key={i} className="flex shrink-0 items-center justify-center">
            <img
              src={logo.src}
              alt={logo.alt}
              style={{ height: logo.h, width: logo.w }}
              className="max-w-[100px] object-contain opacity-60 transition-opacity hover:opacity-100 sm:max-w-none dark:opacity-40 dark:hover:opacity-70"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
