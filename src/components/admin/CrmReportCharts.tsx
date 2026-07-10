"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/content/leads-labels";
import { formatReportAmount, formatReportMonth } from "@/content/reports-labels";
import type { LeadStatus } from "@/lib/leads";
import type { ReportsComparison, ReportsSummary } from "@/lib/reports";

type Props = {
  summary: ReportsSummary;
  compact?: boolean;
  onPipelineClick?: (status: LeadStatus, label: string) => void;
  onSourceClick?: (source: string, label: string) => void;
  onQuotePipelineClick?: (status: string, label: string) => void;
};

const PIPELINE_COLORS = ["#1e40af", "#2563eb", "#3b82f6", "#6366f1", "#059669"];

function SourceBarShape(props: BarShapeProps) {
  const fill = (props.payload as { fill?: string }).fill ?? "#1e40af";
  return <Rectangle {...props} fill={fill} />;
}

export function CrmRevenueChart({ summary, compact }: Props) {
  const data = summary.monthlyTrend.map((row) => ({
    month: formatReportMonth(row.month),
    ca: row.revenue,
    leads: row.leads,
    devis: row.quotesSent,
  }));

  const height = compact ? 220 : 280;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1e40af" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
          <Tooltip
            formatter={(value, name) => [
              name === "ca" ? formatReportAmount(Number(value)) : value,
              name === "ca" ? "CA" : name === "leads" ? "Leads" : "Devis",
            ]}
          />
          <Area type="monotone" dataKey="ca" stroke="#1e40af" fill="url(#caGradient)" strokeWidth={2} />
          <Line type="monotone" dataKey="leads" stroke="#059669" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CrmPipelineChart({ summary, onPipelineClick }: Props) {
  const data = summary.leadPipeline
    .filter((r) => r.key !== "lost")
    .map((row) => ({
      status: row.key as LeadStatus,
      name: LEAD_STATUS_LABELS[row.key as LeadStatus] ?? row.key,
      count: row.count,
      amount: row.amount,
    }));

  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value, name) => [
              name === "amount" ? formatReportAmount(Number(value)) : value,
              name === "amount" ? "Montant" : "Leads",
            ]}
          />
          <Legend />
          <Bar
            dataKey="count"
            name="Leads"
            fill="#1e40af"
            radius={[4, 4, 0, 0]}
            cursor={onPipelineClick ? "pointer" : undefined}
            onClick={
              onPipelineClick
                ? (bar) => {
                    const payload = bar.payload as { status: LeadStatus; name: string };
                    onPipelineClick(payload.status, payload.name);
                  }
                : undefined
            }
          />
        </BarChart>
      </ResponsiveContainer>
      {onPipelineClick && (
        <p className="mt-2 text-center text-[10px] text-gray-text">Cliquez sur une barre pour voir les leads</p>
      )}
    </div>
  );
}

export function CrmConversionChart({ summary }: Props) {
  const data = [
    { label: "Leads → signés", rate: summary.kpis.leadConversionRate },
    { label: "Devis → acceptés", rate: summary.kpis.quoteConversionRate },
  ];

  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit=" %" />
          <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => [`${value} %`, "Conversion"]} />
          <Bar dataKey="rate" fill="#059669" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type ComparisonProps = {
  comparison: ReportsComparison;
};

export function CrmPeriodComparisonChart({ comparison }: ComparisonProps) {
  const data = comparison.metrics.map((m) => ({
    name: m.label,
    actuel: m.current,
    precedent: m.previous,
  }));

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={56} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
          <Tooltip
            formatter={(value, name) => [
              typeof value === "number" && value > 999 ? formatReportAmount(value) : value,
              name === "actuel" ? "Période actuelle" : comparison.previousPeriodLabel,
            ]}
          />
          <Legend />
          <Bar dataKey="precedent" name={comparison.previousPeriodLabel} fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="actuel" name="Période actuelle" fill="#1e40af" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type SourceChartProps = {
  summary: ReportsSummary;
  onSourceClick?: (source: string, label: string) => void;
};

export function CrmSourcesChart({ summary, onSourceClick }: SourceChartProps) {
  const data = summary.leadsBySource.map((row, i) => ({
    source: row.source,
    name: LEAD_SOURCE_LABELS[row.source],
    count: row.count,
    fill: PIPELINE_COLORS[i % PIPELINE_COLORS.length],
  }));

  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-text">Aucune donnée.</p>;
  }

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(value) => [value, "Leads"]} />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            shape={SourceBarShape}
            cursor={onSourceClick ? "pointer" : undefined}
            onClick={
              onSourceClick
                ? (bar) => {
                    const payload = bar.payload as { source: string; name: string };
                    onSourceClick(payload.source, payload.name);
                  }
                : undefined
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
