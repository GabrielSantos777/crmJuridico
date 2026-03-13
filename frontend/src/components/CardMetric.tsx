import { LucideIcon } from 'lucide-react';

interface CardMetricProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  colorVar: string;
}

export function CardMetric({ title, value, icon: Icon, trend, trendUp, colorVar }: CardMetricProps) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-card-foreground">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trendUp ? 'text-success' : 'text-destructive'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: `hsl(var(${colorVar}) / 0.12)` }}
        >
          <Icon className="h-6 w-6" style={{ color: `hsl(var(${colorVar}))` }} />
        </div>
      </div>
    </div>
  );
}
