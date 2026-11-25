import { useMemo, useState } from "react";
import { ArrowDownRight, Scale, ArrowUpRight } from "lucide-react";
import { money, storeLabel, type DealItem } from "../lib/deals";
import { selectTopRealDrops, selectTopStoreGaps } from "../lib/topDrops";

interface TopDropsStripProps {
  deals: DealItem[];
  evaluationTime: number;
  onSelectDeal: (deal: DealItem) => void;
}

export function TopDropsStrip({
  deals,
  evaluationTime,
  onSelectDeal,
}: TopDropsStripProps) {
  const realDrops = useMemo(
    () => selectTopRealDrops(deals, evaluationTime, 5),
    [deals, evaluationTime],
  );
  const storeGaps = useMemo(
    () => selectTopStoreGaps(deals, evaluationTime, 5),
    [deals, evaluationTime],
  );

  const [tab, setTab] = useState<"drops" | "gaps">(() =>
    realDrops.length > 0 ? "drops" : "gaps",
  );

  if (realDrops.length === 0 && storeGaps.length === 0) return null;

  const activeTab =
    tab === "drops" && realDrops.length === 0
      ? "gaps"
      : tab === "gaps" && storeGaps.length === 0
        ? "drops"
        : tab;

  return (
    <section
      className="top-drops-section page-width"
      aria-labelledby="top-drops-heading"
    >
      <div className="top-drops-box">
        <div className="top-drops-header">
          <div>
            <p className="top-drops-kicker">Radar en vivo · Black Friday SV</p>
            <h2 id="top-drops-heading" className="top-drops-title">
              {activeTab === "drops"
                ? "Mayores rebajas reales comprobadas"
                : "Mayores diferencias entre tiendas"}
            </h2>
          </div>

          <div
            className="top-drops-tabs"
            role="tablist"
            aria-label="Hallazgos destacados de hoy"
          >
            {realDrops.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "drops"}
                onClick={() => setTab("drops")}
                className="top-drops-tab"
              >
                <ArrowDownRight width={16} height={16} aria-hidden="true" />
                <span>Top caídas ({realDrops.length})</span>
              </button>
            )}
            {storeGaps.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "gaps"}
                onClick={() => setTab("gaps")}
                className="top-drops-tab"
              >
                <Scale width={16} height={16} aria-hidden="true" />
                <span>Brechas ({storeGaps.length})</span>
              </button>
            )}
          </div>
        </div>

        <div className="top-drops-grid" role="tabpanel">
          {activeTab === "drops"
            ? realDrops.map((item) => (
                <button
                  key={item.deal.id}
                  type="button"
                  onClick={() => onSelectDeal(item.deal)}
                  className="top-drops-card"
                >
                  <div>
                    <div className="top-drops-card-top">
                      <span className="top-drops-badge">
                        -{item.dropPercent}% real
                      </span>
                      <span className="top-drops-meta">
                        {storeLabel(item.deal.store)}
                      </span>
                    </div>
                    <p className="top-drops-name">{item.deal.title}</p>
                  </div>

                  <div className="top-drops-footer">
                    <div className="top-drops-price-row">
                      <div className="top-drops-prices">
                        <strong className="top-drops-price">
                          {money(item.deal.currentPrice)}
                        </strong>
                        <span className="top-drops-old">
                          {money(item.referencePrice)}
                        </span>
                      </div>
                      <ArrowUpRight width={16} height={16} aria-hidden="true" />
                    </div>
                  </div>
                </button>
              ))
            : storeGaps.map((gap) => (
                <button
                  key={gap.deal.id}
                  type="button"
                  onClick={() => onSelectDeal(gap.deal)}
                  className="top-drops-card"
                >
                  <div>
                    <div className="top-drops-card-top">
                      <span className="top-drops-badge">
                        -{money(gap.savingsUsd)}
                      </span>
                      <span className="top-drops-meta">
                        {gap.storeCount} tiendas
                      </span>
                    </div>
                    <p className="top-drops-name">{gap.deal.title}</p>
                  </div>

                  <div className="top-drops-footer">
                    <div className="top-drops-price-row">
                      <strong className="top-drops-price">
                        {money(gap.cheapestPrice)}
                      </strong>
                      <span className="top-drops-store">
                        en {gap.cheapestStore}
                      </span>
                    </div>
                    <p className="top-drops-compare">
                      vs {money(gap.highestPrice)} en {gap.highestStore}
                    </p>
                  </div>
                </button>
              ))}
        </div>
      </div>
    </section>
  );
}
