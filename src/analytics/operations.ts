import { type DailyStats, type PageViewSource } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import { type GetDailyStats } from "wasp/server/operations";

type DailyStatsWithSources = DailyStats & {
  sources: PageViewSource[];
};

type DailyStatsValues = {
  dailyStats: DailyStatsWithSources;
  weeklyStats: DailyStatsWithSources[];
};

export const getDailyStats: GetDailyStats<
  void,
  DailyStatsValues
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (!context.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  const statsQuery = {
    orderBy: {
      date: "desc",
    },
    include: {
      sources: true,
    },
  } as const;

  let [dailyStats, weeklyStats] = await prisma.$transaction([
    context.entities.DailyStats.findFirst(statsQuery),
    context.entities.DailyStats.findMany({ ...statsQuery, take: 7 }),
  ]);

  if (!dailyStats) {
    const nowUTC = new Date();
    nowUTC.setUTCHours(0, 0, 0, 0);

    dailyStats = await context.entities.DailyStats.create({
      data: {
        date: nowUTC,
        totalViews: 0,
        prevDayViewsChangePercent: "0",
        userCount: await prisma.user.count(),
        paidUserCount: 0,
        userDelta: 0,
        paidUserDelta: 0,
        totalRevenue: 0,
        totalProfit: 0,
      },
      include: {
        sources: true,
      },
    });
    weeklyStats = [dailyStats];
  }

  return { dailyStats, weeklyStats };
};
