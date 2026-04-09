import logo1 from "../../client/static/landing/logos/easital.png";
import logo2 from "../../client/static/landing/logos/planova.png";
import logo3 from "../../client/static/landing/logos/packmycode.png";
import logo4 from "../../client/static/landing/logos/qadone.png";
import logo5 from "../../client/static/landing/logos/adventcircle.png";
import logo6a from "../../client/static/landing/logos/beeda.png";
import logo7 from "../../client/static/landing/logos/softic.png";
import logo1dark from "../../client/static/landing/logos/easitald.png";
import logo2dark from "../../client/static/landing/logos/planovad.png";
import logo3dark from "../../client/static/landing/logos/packmycoded.png";
import logo4dark from "../../client/static/landing/logos/qadoned.png";
import logo5dark from "../../client/static/landing/logos/adventcircled.png";
import logo6adark from "../../client/static/landing/logos/beedad.png";
import logo7dark from "../../client/static/landing/logos/softicd.png";
const logos = [
  { light: logo1, dark: logo1dark, alt: "easital" },
  { light: logo2, dark: logo2dark, alt: "Planova" },
  { light: logo3, dark: logo3dark, alt: "Packmycode" },
  { light: logo4, dark: logo4dark, alt: "qadone" },
  { light: logo5, dark: logo5dark, alt: "adventcircle" },
  { light: logo6a, dark: logo6adark, alt: "beeda" },
  { light: logo7, dark: logo7dark, alt: "softic" },
];

export default function Clients() {
  return (
    <div className="mx-auto -mt-1 flex max-w-7xl flex-col items-center px-4 pb-[14px] md:px-6">


      {/* Mobile: horizontal scroll / Desktop: spread out */}
      <p className="text-[15px] leading-[1.6] tracking-[-0.27px] text-[#707070] sm:text-[18px] dark:text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
        Trusted by{" "}
        <span className="font-semibold text-[#0a0f14] dark:text-foreground">50+ companies</span>
        {" "}of all sizes
      </p>
      <div className=" flex w-full items-center gap-2 overflow-x-auto px-4  scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        {logos.map((logo, i) => (
          <div key={i} className="flex shrink-0 items-center justify-center">
            <img
              src={logo.light}
              alt={logo.alt}
              className="h-[120px] w-full dark:hidden"
              loading="lazy"
            />
            <img
              src={logo.dark}
              alt={logo.alt}
              className="hidden h-[120px] w-full dark:block"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
