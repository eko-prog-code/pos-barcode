export const formatIDR = (amount: number): string => {
  // Jika amount bukan angka (NaN), pakai 0 sebagai fallback
  const safeAmount = isNaN(amount) ? 0 : amount;

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
};
