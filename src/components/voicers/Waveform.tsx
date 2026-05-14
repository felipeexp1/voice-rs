export function Waveform({ color = "currentColor", bars = 18, height = 28 }: { color?: string; bars?: number; height?: number }) {
  return (
    <div className="flex items-end" style={{ color, height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className="waveform-bar" style={{ animationDelay: `${(i % 6) * 0.12}s`, height: "60%" }} />
      ))}
    </div>
  );
}
