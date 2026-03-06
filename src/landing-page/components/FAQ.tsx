import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../client/components/ui/accordion";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  href?: string;
}

export default function FAQ({ faqs }: { faqs: FAQ[] }) {
  return (
    <div className="mx-auto my-16 flex max-w-[970px] flex-col items-center gap-[24px] px-4 sm:my-24 sm:gap-[40px] sm:px-6 md:my-32 lg:px-8">
      <div className="flex flex-col items-center gap-[10px] text-center">
        <h2 className="text-[26px] font-semibold leading-[1.2] tracking-[0.44px] text-[#0a0f14] sm:text-[36px] md:text-[44px] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
          Frequently asked questions
        </h2>
        <p className="max-w-[686px] text-[14px] leading-[1.6] text-[#7c7f85] sm:text-[16px] dark:text-muted-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
          Automate social engagement, scheduling, messaging, and analytics to grow your audience across multiple platforms effortlessly and maximize marketing performance today.
        </p>
      </div>

      <Accordion
        type="single"
        collapsible
        defaultValue="faq-1"
        className="w-full"
      >
        {faqs.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={`faq-${faq.id}`}
            className="border-b border-[rgba(18,10,11,0.2)] py-[16px] sm:py-[24px] dark:border-border"
          >
            <AccordionTrigger className="text-left text-[15px] font-semibold leading-[1.6] tracking-[0.17px] text-[#120a0b] transition-colors duration-200 hover:no-underline sm:text-[17px] sm:leading-[30.6px] dark:text-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-[14px] leading-[1.6] text-[#7c7f85] sm:max-w-[491px] sm:text-[16px] dark:text-muted-foreground" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
                {faq.answer}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
