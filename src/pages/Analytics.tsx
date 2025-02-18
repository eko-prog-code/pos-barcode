import { useState, useEffect } from "react";
import { subscribeToSales } from "@/services/saleService";
import { Sale } from "@/types/pos";
import { formatIDR } from "@/lib/currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Analytics = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  useEffect(() => {
    const unsubscribe = subscribeToSales((salesData) => {
      setSales(salesData);
    });
    return () => unsubscribe();
  }, []);

  // Compute unique years from sales data for the year filter
  const years = Array.from(
    new Set(sales.map((sale) => new Date(sale.date).getFullYear()))
  ).sort((a, b) => a - b);

  // Filter sales berdasarkan bulan dan tahun yang dipilih (untuk chart)
  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    const saleMonth = saleDate.getMonth() + 1; // bulan dimulai dari 0
    const saleYear = saleDate.getFullYear();

    if (selectedMonth !== "all" && saleMonth !== parseInt(selectedMonth))
      return false;
    if (selectedYear !== "all" && saleYear !== parseInt(selectedYear))
      return false;
    return true;
  });

  // Group filtered sales by date untuk chart
  const salesByDate = filteredSales.reduce(
    (acc: { [key: string]: number }, sale) => {
      const date = new Date(sale.date).toLocaleDateString();
      acc[date] = (acc[date] || 0) + sale.total;
      return acc;
    },
    {}
  );

  // Convert ke array untuk chart data
  const chartData = Object.entries(salesByDate).map(([date, total]) => ({
    date,
    total,
  }));

  // Overall analytics (tanpa filter)
  // Group all sales by date untuk highest sales day
  const overallSalesByDate = sales.reduce(
    (acc: { [key: string]: number }, sale) => {
      const date = new Date(sale.date).toLocaleDateString();
      acc[date] = (acc[date] || 0) + sale.total;
      return acc;
    },
    {}
  );

  // Cari 6 tanggal dengan total penjualan tertinggi
  const top6HighestSalesDays = Object.entries(overallSalesByDate)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // --- Modifikasi untuk Peak Hours ---
  // Hitung jumlah transaksi per jam (setiap record sale dianggap 1 transaksi)
  const transactionsByHour = sales.reduce(
    (acc: { [key: number]: number }, sale) => {
      const hour = new Date(sale.date).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    },
    {}
  );

  // Ubah ke array dan urutkan berdasarkan jumlah transaksi (descending)
  const hourlyTransactions = Object.entries(transactionsByHour)
    .map(([hour, count]) => ({ hour: Number(hour), count }))
    .sort((a, b) => b.count - a.count);

  // Ambil 3 range waktu dengan transaksi tertinggi
  const top3PeakHours = hourlyTransactions.slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 6 Highest Sales Days</CardTitle>
            <CardDescription>
              6 tanggal dengan total penjualan tertinggi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {top6HighestSalesDays.map(({ date, total }) => (
              <div key={date} className="mb-2">
                <span className="font-medium">{date}</span>:{" "}
                <span>{formatIDR(total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
            <CardDescription>
              3 range waktu dengan jumlah transaksi tertinggi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {top3PeakHours.map(({ hour, count }) => (
              <div key={hour} className="mb-2">
                jam {hour < 10 ? `0${hour}` : hour}:00 hingga{" "}
                {hour + 1 < 10 ? `0${hour + 1}` : hour + 1}:00 jumlah transaksi
                penjualan {count} transaksi
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Trend</CardTitle>
          <CardDescription>Sales volume by date</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center space-x-4 mb-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          {/* Chart */}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatIDR(value)} />
                <Bar dataKey="total" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
