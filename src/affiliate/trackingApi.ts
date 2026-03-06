import type { Request, Response } from "express";

export const affiliateTrackClick = async (req: Request, res: Response, context: any) => {
  try {
    const code = req.params.code;
    if (!code) {
      return res.redirect("/");
    }

    // Find the affiliate link
    const link = await context.entities.AffiliateLink.findUnique({
      where: { code },
    });

    if (!link || !link.isActive) {
      return res.redirect("/");
    }

    // Record the click
    await context.entities.AffiliateClick.create({
      data: {
        linkId: link.id,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
        userAgent: req.headers["user-agent"] || null,
        referrer: req.headers["referer"] || null,
      },
    });

    // Set referral cookie (default 90 days)
    const cookieDays = 90;
    res.cookie("mAutomate_ref", code, {
      maxAge: cookieDays * 24 * 60 * 60 * 1000,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // Redirect to homepage or custom destination
    const redirect = (req.query.redirect as string) || "/";
    return res.redirect(redirect);
  } catch (error) {
    console.error("[Affiliate] Click tracking error:", error);
    return res.redirect("/");
  }
};
