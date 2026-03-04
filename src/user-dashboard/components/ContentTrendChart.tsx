import { useState, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Card, CardContent, CardHeader, CardTitle } from "../../client/components/ui/card";

interface DailyData {
  date: string;
  created: number;
  published: number;
}

function aggregateByWeek(data: DailyData[]): DailyData[] {
  const weeks = new Map<string, { created: number; published: number }>();

  for (const d of data) {
    const dt = new Date(d.date);
    // Get Monday of this week
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(dt.setDate(diff));
    const weekKey = monday.toISOString().slice(0, 10);

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, { created: 0, published: 0 });
    }
    const w = weeks.get(weekKey)!;
    w.created += d.created;
    w.published += d.published;
  }

  return Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}

export default function ContentTrendChart({ data }: { data: DailyData[] }) {
  const [mode, setMode] = useState<"day" | "week">("day");

  const chartData = useMemo(
    () => (mode === "week" ? aggregateByWeek(data) : data),
    [data, mode]
  );

  const options: ApexOptions = {
    chart: {
      type: "area",
      height: 350,
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    colors: ["#3C50E0", "#80CAEE"],
    dataLabels: { enabled: false },
    stroke: { width: 2, curve: "smooth" },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.3, opacityTo: 0, stops: [0, 100] },
    },
    xaxis: {
      categories: chartData.map((d) => d.date),
      labels: {
        style: { fontSize: "12px" },
        formatter: (val: string) => {
          if (!val) return val;
          const dt = new Date(val);
          return `${dt.getMonth() + 1}/${dt.getDate()}`;
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { fontSize: "12px" } },
      min: 0,
      forceNiceScale: true,
    },
    grid: {
      strokeDashArray: 4,
      borderColor: "hsl(var(--border))",
    },
    tooltip: {
      x: {
        formatter: (val: number) => {
          const d = chartData[val - 1];
          return d ? d.date : "";
        },
      },
    },
    legend: { position: "top", horizontalAlign: "left" },
  };

  const series = [
    { name: "Posts Created", data: chartData.map((d) => d.created) },
    { name: "Posts Published", data: chartData.map((d) => d.published) },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Content Trend</CardTitle>
        <div className="border-border inline-flex rounded-lg border">
          <button
            onClick={() => setMode("day")}
            className={`rounded-l-md px-3 py-1 text-xs font-medium transition-colors ${
              mode === "day"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setMode("week")}
            className={`rounded-r-md px-3 py-1 text-xs font-medium transition-colors ${
              mode === "week"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Week
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No data for this period yet.
          </p>
        ) : (
          <ReactApexChart options={options} series={series} type="area" height={350} />
        )}
      </CardContent>
    </Card>
  );
}
