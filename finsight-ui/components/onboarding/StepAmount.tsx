"use client";

export function StepAmount({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9]/g, "");
    onChange(cleaned ? parseInt(cleaned, 10) : 0);
  };

  return (
    <div>
      <h2 className="font-serif text-4xl text-ink-primary">How much have you already invested?</h2>
      <p className="mt-3 text-ink-secondary">
        Roughly is fine — you can update this later.
      </p>

      <div className="mt-12 flex items-baseline justify-center gap-2">
        <span className="font-serif text-5xl text-ink-tertiary">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={value.toLocaleString("en-US")}
          onChange={handleChange}
          className="font-serif text-7xl bg-transparent text-forest-primary text-center w-full max-w-md outline-none border-b-2 border-line-soft focus:border-forest-primary transition-colors tabular-nums"
        />
      </div>

      <p className="mt-6 text-center text-sm text-ink-tertiary">
        Across all your investment accounts (brokerage, retirement, etc.)
      </p>
    </div>
  );
}
