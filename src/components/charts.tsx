"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactINR, formatINR, ORDER_STATUS_META } from "@/lib/format";
import type { OrderStatus } from "@/db/schema";

const PALETTE = [
  "#2874f0",
  "#fb641b",
  "#388e3c",
  "#ff9f00",
  "#a855f7",
  "#0ea5e9",
  "#ec4899",
  "#64748b",
];

function shortDay(day: string) {
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type TooltipPayload = { name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> };

function ChartTooltip({
  active,
  payload,
  label,
  currencyKeys = [],
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  currencyKeys?: string[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-fk-border/70 bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && (
        <p className="mb-1 font-semibold text-fk-text">{String(label)}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-fk-muted">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}:{" "}
          <span className="font-semibold text-fk-text">
            {currencyKeys.includes(String(p.name))
              ? formatINR(Number(p.value))
              : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function RevenueAreaChart({
  data,
}: {
  data: { day: string; revenue: number; orders: number }[];
}) {
  const chartData = data.map((d) => ({ ...d, label: shortDay(d.day) }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2874f0" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2874f0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#878787" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#878787" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatCompactINR(v)}
            width={60}
          />
          <Tooltip content={<ChartTooltip currencyKeys={["Revenue"]} />} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#2874f0"
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDonut({
  data,
}: {
  data: { status: OrderStatus; count: number }[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d) => ({
    name: ORDER_STATUS_META[d.status].label,
    value: d.count,
    color: ORDER_STATUS_META[d.status].color,
  }));
  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={85}
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-fk-text">{total}</span>
        <span className="text-[11px] uppercase tracking-wide text-fk-muted">orders</span>
      </div>
    </div>
  );
}

export function MonthlyBarChart({
  data,
}: {
  data: { label: string; revenue: number; orders: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#878787" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#878787" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatCompactINR(v)}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#878787" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<ChartTooltip currencyKeys={["Revenue"]} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#2874f0" radius={[3, 3, 0, 0]} />
          <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#ff9f00" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryPie({
  data,
}: {
  data: { name: string; revenue: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="name"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            content={<ChartTooltip currencyKeys={data.map((d) => d.name)} />}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentMethodBar({
  data,
}: {
  data: { label: string; count: number; amount: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: "#424242" }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip content={<ChartTooltip currencyKeys={["Amount"]} />} />
          <Bar dataKey="amount" name="Amount" radius={[0, 3, 3, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.label} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrdersSparkBar({
  data,
}: {
  data: { day: string; orders: number }[];
}) {
  const chartData = data.map((d) => ({ ...d, label: shortDay(d.day) }));
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} barSize={8}>
          <XAxis dataKey="label" hide />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f3f6" }} />
          <Bar dataKey="orders" name="Orders" fill="#fb641b" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
