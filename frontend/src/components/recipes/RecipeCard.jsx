import { ArrowUpRight, Clock3 } from "lucide-react";
import { Link } from "react-router";

function RecipeCard({ recipe }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-[#244b3b]/10 bg-white transition-shadow hover:shadow-[0_18px_45px_rgba(41,44,39,0.11)]">
      <Link to={`/recipes/${recipe.slug}`} className="block">
        <div className="relative h-56 overflow-hidden bg-[#e6dfd2]">
          <img
            src={recipe.image}
            alt={recipe.imageAlt}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <span className="absolute left-4 top-4 rounded-full bg-[#f4f0e7]/95 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-primary">
            Sample recipe
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6c4d]">
            <span>{recipe.cuisine}</span>
            <ArrowUpRight
              aria-hidden="true"
              size={15}
              className="text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </div>

          <h2 className="mt-2 font-editorial text-2xl leading-snug text-[#292c27]">
            {recipe.title}
          </h2>

          <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#71736a]">
            {recipe.description}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-[#244b3b]/10 pt-4 text-[11px] text-[#74766e]">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} aria-hidden="true" />
              {recipe.timeMinutes} min
            </span>
            <span>{recipe.difficulty}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default RecipeCard;