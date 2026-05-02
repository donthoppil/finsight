"use client";

import { Separator } from "react-resizable-panels";

export function ResizeHandle() {
  return (
    <Separator
      className="
        relative group shrink-0 w-3
        outline-none focus-visible:outline-2 focus-visible:outline-forest-primary
        cursor-col-resize select-none
      "
    >
      {/* Always-visible track — 3px wide rounded pill in soft slate.
          Hovering or dragging widens it and shifts to brand blue. */}
      <div
        className="
          pointer-events-none absolute inset-y-2 left-1/2 -translate-x-1/2
          w-[3px] rounded-full bg-line-medium
          transition-all duration-200 ease-out
          group-hover:w-[5px] group-hover:bg-forest-soft
          group-data-[separator=active]:w-[5px] group-data-[separator=active]:bg-forest-primary
        "
      />

      {/* Grip dots — always softly visible, brighter on hover/drag */}
      <div
        className="
          pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          flex flex-col gap-1
          opacity-50 transition-opacity duration-200
          group-hover:opacity-100 group-data-[separator=active]:opacity-100
        "
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="
              w-[2px] h-[2px] rounded-full bg-white
              shadow-[0_0_0_0.5px_rgba(15,27,45,0.25)]
            "
          />
        ))}
      </div>
    </Separator>
  );
}
