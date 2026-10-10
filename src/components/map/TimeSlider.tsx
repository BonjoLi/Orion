"use client";

type Props = {
  hours: string[];
  value: string;
  onChange: (hour: string) => void;
  eventName: string;
};

export function TimeSlider({ hours, value, onChange, eventName }: Props) {
  const idx = Math.max(0, hours.indexOf(value));
  return (
    <div className="rounded-xl bg-black/75 p-3 backdrop-blur">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{eventName}</span>
        <span>{new Date(value).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, hours.length - 1)}
        value={idx}
        onChange={(e) => onChange(hours[Number(e.target.value)])}
        className="mt-2 w-full"
      />
    </div>
  );
}
