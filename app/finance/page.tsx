"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  FileText,
  Landmark,
  Plus,
  Printer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { authFetch, getAuthToken } from "../lib/api";
import { formatFCFA } from "../lib/format";
import { useRouter } from "next/navigation";

type Overview = {
  revenue_month: number;
  expense_month: number;
  profit_month: number;
  treasury_balance: number;
  series: { month: string; revenue: number; expense: number; profit: number }[];
};

type Budget = {
  id: number;
  category: string;
  planned_amount: string | number;
  period: string;
  month: number | null;
  note: string;
};

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1a`, color }}>
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black" style={{ color }}>
        {formatFCFA(value)}
      </p>
    </div>
  );
}

export default function FinancePage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: "", planned_amount: "", period: "mensuel", month: new Date().getMonth() + 1 });
  const [message, setMessage] = useState("");

  const load = () => {
    Promise.all([
      authFetch("/finance/overview", { cache: "no-store" }).then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || "Erreur finance.");
        return d;
      }),
      authFetch("/finance/budgets", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([ov, bg]) => {
        setOverview(ov);
        setBudgets(Array.isArray(bg) ? bg : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/login?redirect=/finance");
      return;
    }
    load();
  }, [router]);

  const chartData = useMemo(
    () =>
      (overview?.series || []).map((row) => {
        const [, m] = row.month.split("-");
        return { ...row, label: MONTHS_FR[Number(m) - 1] || row.month };
      }),
    [overview]
  );

  const addBudget = async () => {
    const amount = Number(form.planned_amount);
    if (!form.category.trim() || !amount) {
      setMessage("Catégorie et montant obligatoires.");
      return;
    }
    const response = await authFetch("/finance/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    if (response?.ok) {
      setForm({ category: "", planned_amount: "", period: "mensuel", month: new Date().getMonth() + 1 });
      setMessage("Budget enregistré.");
      load();
    } else {
      const d = await response?.json().catch(() => ({}));
      setMessage(d?.error || "Erreur.");
    }
  };

  const deleteBudget = async (id: number) => {
    await authFetch(`/finance/budgets/${id}`, { method: "DELETE" }).catch(() => {});
    load();
  };

  // Export CSV réel (téléchargement client, données réelles).
  const exportCsv = () => {
    if (!overview) return;
    const lines = [
      "Mois,Revenus,Dépenses,Bénéfice",
      ...overview.series.map((row) => `${row.month},${row.revenue},${row.expense},${row.profit}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-malilink-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ml-navy,#0f1b3d)] text-[var(--ml-gold,#d4a23c)]">
              <Landmark size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-black">Finance</h1>
              <p className="text-sm text-gray-500">Revenus, dépenses, trésorerie et budgets — données réelles.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-bold text-gray-700 shadow-sm">
              <Download size={16} /> CSV
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-[var(--ml-navy,#0f1b3d)] px-4 py-2.5 font-bold text-white">
              <Printer size={16} /> PDF
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-10 text-center font-semibold text-gray-500">Chargement...</p>
        ) : error ? (
          <p className="mt-8 rounded-2xl bg-white p-6 text-center font-bold text-red-600 shadow">{error}</p>
        ) : overview ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard title="Revenus (mois)" value={overview.revenue_month} icon={TrendingUp} color="#15803d" />
              <StatCard title="Dépenses (mois)" value={overview.expense_month} icon={TrendingDown} color="#b91c1c" />
              <StatCard
                title="Bénéfice (mois)"
                value={overview.profit_month}
                icon={FileText}
                color={overview.profit_month >= 0 ? "#0f1b3d" : "#b91c1c"}
              />
              <StatCard title="Trésorerie" value={overview.treasury_balance} icon={Wallet} color="#b3862e" />
            </div>

            {/* Graphique revenus vs dépenses */}
            <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="font-black text-black">Revenus vs Dépenses — 6 mois</h2>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={11} width={70} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatFCFA(Number(v))} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenus" fill="#15803d" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Dépenses" fill="#b91c1c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tendance bénéfice */}
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="font-black text-black">Tendance du bénéfice</h2>
              <div className="mt-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={11} width={70} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatFCFA(Number(v))} />
                    <Line type="monotone" dataKey="profit" name="Bénéfice" stroke="#d4a23c" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Budgets */}
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm print:hidden">
              <h2 className="font-black text-black">Budgets</h2>
              {message && <p className="mt-2 text-sm font-bold text-gray-600">{message}</p>}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Catégorie (ex : Marketing)"
                  className="flex-1 rounded-xl border border-gray-200 p-2.5 text-black"
                />
                <input
                  type="number"
                  value={form.planned_amount}
                  onChange={(e) => setForm({ ...form, planned_amount: e.target.value })}
                  placeholder="Montant prévu (FCFA)"
                  className="rounded-xl border border-gray-200 p-2.5 text-black sm:w-44"
                />
                <button onClick={addBudget} className="flex items-center justify-center gap-1.5 rounded-xl bg-yellow-500 px-4 py-2.5 font-black text-black">
                  <Plus size={16} /> Ajouter
                </button>
              </div>
              {budgets.length > 0 && (
                <div className="mt-3 space-y-2">
                  {budgets.map((budget) => (
                    <div key={budget.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                      <span className="flex-1 font-bold text-black">{budget.category}</span>
                      <span className="text-sm text-gray-500">{budget.period}</span>
                      <span className="font-black text-black">{formatFCFA(Number(budget.planned_amount))}</span>
                      <button onClick={() => deleteBudget(budget.id)} aria-label="Supprimer" className="text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
