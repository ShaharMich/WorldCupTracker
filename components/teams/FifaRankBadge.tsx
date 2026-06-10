// Gold "#5" pill showing a team's current FIFA world ranking. Used on TeamCard
// (compact) and the team detail header (with `label` for the "FIFA #5" form).
export function FifaRankBadge({
  rank,
  label = false,
  className = "",
}: {
  rank: number;
  label?: boolean;
  className?: string;
}) {
  return (
    <span
      title={`FIFA World Ranking #${rank}`}
      className={`inline-flex items-center rounded-md bg-gold/15 px-1.5 py-0.5 text-xs font-bold text-gold ring-1 ring-gold/30 ${className}`}
    >
      {label ? "FIFA " : ""}#{rank}
    </span>
  );
}
