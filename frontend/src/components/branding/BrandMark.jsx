import { HandPlatter } from "lucide-react";

function BrandMark({ inverse = false, compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`relative grid size-10 shrink-0 place-items-center rounded-full ${
          inverse ? "bg-[#f4f0e7] text-primary" : "bg-primary text-white"
        }`}
        aria-hidden="true"
      >
        <HandPlatter size={21} strokeWidth={1.7} />
        <span
          className={`absolute right-[7px] top-[7px] size-1.5 rounded-full ${
            inverse ? "bg-[#bd8050]" : "bg-[#d99b65]"
          }`}
        />
      </span>

      <span className="flex flex-col leading-none">
        <span
          className={`text-[16px] font-semibold tracking-[-0.045em] ${
            inverse ? "text-[#f4f0e7]" : "text-[#292c27]"
          }`}
        >
          Flavo<span className={inverse ? "text-[#e6bd96]" : "text-primary"}>Lens</span>
        </span>
        {!compact && (
          <span
            className={`mt-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
              inverse ? "text-white/55" : "text-[#777970]"
            }`}
          >
            Recipe Debugger
          </span>
        )}
      </span>
    </span>
  );
}

export default BrandMark;