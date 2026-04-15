import type { Asset, BalanceSheet, Liability } from "@/lib/types";
import type { AssetRow, LiabilityRow, NetWorthHistoryRow } from "./rows";

function mapAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Asset["category"],
    value: row.value,
    asOfDate: row.as_of_date,
    liquidityTier: row.liquidity_tier as Asset["liquidityTier"],
    ...(row.note ? { note: row.note } : {}),
  };
}

function mapLiability(row: LiabilityRow): Liability {
  const li: Liability = {
    id: row.id,
    name: row.name,
    category: row.category as Liability["category"],
    balance: row.balance,
    monthlyPayment: row.monthly_payment,
  };
  if (row.apr != null) li.apr = row.apr;
  if (row.linked_asset_id) li.linkedAssetId = row.linked_asset_id;
  if (row.remaining_payments != null) li.remainingPayments = row.remaining_payments;
  return li;
}

/**
 * Aggregates assets/liabilities into BalanceSheet totals.
 * Classification matches MOCK_SNAPSHOT: liquid = cash only; invested = investment;
 * real = property + vehicle.
 */
export function buildBalanceSheet(
  assets: AssetRow[],
  liabilities: LiabilityRow[],
  netWorthHistory: NetWorthHistoryRow[],
  snapshotPeriod: string
): BalanceSheet {
  const mappedAssets = assets.map(mapAsset);
  const mappedLiabilities = liabilities.map(mapLiability);

  const totalAssetValue = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);

  const liquidAssets = assets
    .filter((a) => a.category === "cash")
    .reduce((s, a) => s + a.value, 0);

  const investedAssets = assets
    .filter((a) => a.category === "investment")
    .reduce((s, a) => s + a.value, 0);

  const realAssets = assets
    .filter((a) => a.category === "property" || a.category === "vehicle")
    .reduce((s, a) => s + a.value, 0);

  const netWorth = totalAssetValue - totalLiabilities;

  const sorted = [...netWorthHistory].sort((a, b) =>
    a.period.localeCompare(b.period)
  );
  const idx = sorted.findIndex((p) => p.period === snapshotPeriod);
  const netWorthPrevious =
    idx > 0 ? sorted[idx - 1]!.value : 0;

  return {
    assets: mappedAssets,
    liabilities: mappedLiabilities,
    netWorth,
    netWorthPrevious,
    liquidAssets,
    investedAssets,
    realAssets,
    totalLiabilities,
  };
}
