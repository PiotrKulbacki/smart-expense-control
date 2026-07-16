'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type DonutChartDatum = {
  category: string;
  amount: number;
  fill: string;
  label: string;
};

type CategoryDonutChartPieProps = {
  chartData: DonutChartDatum[];
  primaryCurrency: string;
  locale: string;
  formatMoney: (amount: number, currency: string, locale: string) => string;
};

export function CategoryDonutChartPie({
  chartData,
  primaryCurrency,
  locale,
  formatMoney,
}: CategoryDonutChartPieProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="amount"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={68}
          outerRadius={96}
          paddingAngle={2}
          strokeWidth={2}
          stroke="var(--surface)"
        >
          {chartData.map((entry) => (
            <Cell key={entry.category} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) =>
            typeof value === 'number'
              ? formatMoney(value, primaryCurrency, locale)
              : String(value ?? '')
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
