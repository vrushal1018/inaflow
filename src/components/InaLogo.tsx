import React from "react";

interface InaLogoProps {
  variant?: "dark" | "light";
  stacked?: boolean;
}

export function InaLogo({ variant = "dark", stacked = false }: InaLogoProps) {
  const inaColor = variant === "light" ? "#FFFFFF" : "#2495D3";
  const textColor = variant === "light" ? "#FFFFFF" : "#111111";

  if (stacked) {
    return (
      <div className="inline-flex flex-col leading-none select-none">
        <span
          className="text-3xl font-bold tracking-tight"
          style={{ color: inaColor }}
        >
          ina
        </span>
        <span
          className="mt-1 text-base tracking-[0.18em] lowercase"
          style={{ color: textColor }}
        >
          <span className="font-light">space</span>{" "}
          <span className="font-semibold">works</span>
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-baseline gap-1.5 leading-none select-none">
      <span
        className="text-xl font-bold tracking-tight"
        style={{ color: inaColor }}
      >
        ina
      </span>
      <span
        className="text-sm tracking-[0.16em] lowercase"
        style={{ color: textColor }}
      >
        <span className="font-light">space</span>{" "}
        <span className="font-semibold">works</span>
      </span>
    </div>
  );
}
