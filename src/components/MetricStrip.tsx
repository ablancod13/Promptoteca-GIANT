interface MetricStripProps {
  metrics: Array<{ label: string; value: string | number }>;
}

export function MetricStrip({ metrics }: MetricStripProps) {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <strong>{metric.value}</strong>
          <span>{metric.label}</span>
        </div>
      ))}
    </div>
  );
}
