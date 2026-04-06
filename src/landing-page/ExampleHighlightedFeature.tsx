import aiReadydark from "../client/static/landing/ai-ready-dark.png";
import aiReadywhite from "../client/static/landing/ai-ready-white.png";

import playIcon from "../client/static/landing/play-icon.svg";
import numberOval from "../client/static/landing/number-oval.svg";

export default function AIReady() {
  return (
    <div className="mx-auto my-16 flex max-w-7xl flex-col items-center  px-4 sm:my-24 sm:px-6 md:my-32 md:flex-row md:items-center md:gap-[50px] lg:gap-12 lg:px-8">
      {/* Left: AI Ready illustration with floating labels */}
      <div className="relative mx-auto h-[280px] w-full max-w-4xl shrink-0 overflow-hidden sm:h-[350px] sm:max-w-[400px] md:h-[436px] md:max-w-[449px]">
        <img
          src={aiReadywhite}
          alt="AI Ready"
          className="absolute inset-0 h-full w-full object-cover dark:hidden"
        />
        <img
          src={aiReadydark}
          alt="AI Ready"
          className="absolute inset-0 hidden h-full w-full object-cover dark:block"
        />
        {/* Play button overlay — uses percentage positioning */}
        <div className="absolute left-[45%] top-[43%] flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#bd711d] p-[12px] sm:h-[50px] sm:w-[50px] sm:p-[14px] md:h-[58px] md:w-[58px] md:p-[16px]">
          <img src={playIcon} alt="" className="h-[20px] w-[20px] md:h-[24px] md:w-[24px]" />
        </div>
        {/* Floating labels — percentage based positioning */}
        <div className="absolute left-[40%] top-[16%]" style={{ transform: "rotate(5.43deg)" }}>
          <div className="bg-white p-[3px] sm:p-[4px]">
            <span className="text-[10px] font-semibold tracking-[1.5px] text-[#0a0f14] sm:text-[11px] sm:tracking-[2px] md:text-[13px] md:tracking-[2.21px]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Chatbot Smart Automation
            </span>
          </div>
        </div>
        <div className="absolute left-[9%] top-[73%]" style={{ transform: "rotate(-9.58deg)" }}>
          <div className="w-[140px] bg-white p-[3px] text-center sm:w-[160px] sm:p-[4px] md:w-[187px]">
            <span className="text-[10px] font-semibold tracking-[1.5px] text-[#0a0f14] sm:text-[11px] sm:tracking-[2px] md:text-[13px] md:tracking-[2.21px]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Social Media Agent
            </span>
          </div>
        </div>
        <div className="absolute left-[72%] top-[63%]" style={{ transform: "rotate(16.51deg)" }}>
          <div className="w-[80px] p-[2px] text-center md:w-[96px]" style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0) 1.4%, #fff 14.8%, #fff 97.3%)" }}>
            <span className="text-[9px] font-semibold tracking-[-0.17px] text-black md:text-[11.4px]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Brand Voice
            </span>
          </div>
        </div>
        <div className="absolute left-[3%] top-[23%]" style={{ transform: "rotate(-12.96deg)" }}>
          <div className="w-[60px] bg-[#f7ede3] p-[2px] text-center md:w-[69px]">
            <span className="text-[8px] font-semibold tracking-[-0.17px] text-black md:text-[9px]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              AWS File Upload
            </span>
          </div>
        </div>
      </div>

      {/* Right: Text content */}
      <div className="flex w-full max-w-[535px] flex-col gap-[24px] sm:gap-[32px] mt-8 md:mt-0">
        <div className="flex flex-col gap-[8px]">
          <h2 className="text-[28px] font-semibold leading-[1.2] tracking-[0.44px] text-[#0a0f14] sm:text-[36px] md:text-[44px] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            Results-Driven Automation
          </h2>
          <p className="text-[15px] leading-[1.6] tracking-[0.16px] text-[#7c7f85] sm:text-[16px] dark:text-muted-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
            mAutomate.ai analyzes campaign performance and continuously improves targeting, timing, and messaging.
          </p>
        </div>

        {/* Numbered features */}
        <div className="flex flex-col gap-[24px]">
          <div className="flex gap-4 sm:gap-5xl">
            <div>
              <div className=" rounded-full border border-[#f6e7d5] flex h-14 w-14 items-center justify-center">
                <h1 className="flex items-center justify-center bg-[#EEE4DD] dark:bg-card rounded-full h-10 w-10">1</h1>
              </div>
            </div>
            <div className="flex flex-col gap-[8px] sm:gap-[10px]">
              <p className="text-[17px] font-semibold leading-[1.2] text-[#030303] sm:text-[20px] dark:text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                AI That Optimizes Every Campaign
              </p>
              <p className="text-[14px] leading-[1.6] text-[#7c7f85] sm:text-[16px] dark:text-muted-foreground">
                mAutomate.ai tracks performance data and automatically refines targeting, timing, and messaging for better results.
              </p>
            </div>
          </div>

          <div className="flex gap-[16px] sm:gap-[20px]">
            <div>
              <div className=" rounded-full border border-[#f6e7d5] flex h-14 w-14 items-center justify-center">
                <h1 className="flex items-center justify-center bg-[#EEE4DD] dark:bg-card rounded-full h-10 w-10">2</h1>
              </div>
            </div>
            <div className="flex flex-col gap-[8px] sm:gap-[10px]">
              <p className="text-[17px] font-semibold leading-[1.2] text-[#030303] sm:text-[20px] dark:text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Smart Automation That Gets Smarter
              </p>
              <p className="text-[14px] leading-[1.6] text-[#7c7f85] sm:text-[16px] dark:text-muted-foreground">
                mAutomate.ai studies campaign outcomes and continuously adjusts strategy to improve reach, engagement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
