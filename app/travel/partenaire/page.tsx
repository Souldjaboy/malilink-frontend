"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Building2, Bus, Route as RouteIcon, Clock, BarChart3, Ticket,
  Receipt, Store, Upload, ShieldCheck, Star, Plus, Loader2, CheckCircle2,
} from "lucide-react";
import GeoInput from "../components/GeoInput";
import { StatsTab, BookingsTab, PaymentsTab, PosTab, ImportTab } from "./OperationsTabs";
import { EmptyState, ErrorState } from "../components/States";
import {
  fetchMyCompany, createCompany, fetchVehicles, createVehicle, fetchRoutes,
  createRoute, createSchedule, createPrice, publishRoute, unpublishRoute,
  NotFoundError, CATEGORIES, MODE_EMOJI,
  type TravelCompany, type TravelVehicle, type TravelRoute, type GeoPlace,
} from "../lib/travelApi";

const TRANSPORT_MODES = CATEGORIES.filter((c) => c.searchable && c.mode).map((c) => ({ code: c.mode as string, label: c.label }));
const DAYS = [
  { v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mer" }, { v: 4, l: "Jeu" },
  { v: 5, l: "Ven" }, { v: 6, l: "Sam" }, { v: 0, l: "Dim" },
];

const inputCls =
  "w-full rounded-xl border border-[var(--ml-border)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--ml-text)] outline-none focus:border-[var(--ml-gold)] focus:ring-2 focus:ring-[var(--ml-gold)]/30 dark:border-white/10 dark:bg-white/5 dark:text-white";
const labelCls = "mb-1 block text-xs font-semibold text-[var(--ml-text-soft)] dark:text-white/60";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[var(--ml-border)] bg-white p-5 dark:border-white/10 dark:bg-white/5">{children}</div>;
}

const TABS = [
  { key: "vehicules", label: "Véhicules", icon: Bus },
  { key: "lignes", label: "Lignes", icon: RouteIcon },
  { key: "horaires", label: "Horaires & tarifs", icon: Clock },
  { key: "statistiques", label: "Statistiques", icon: BarChart3 },
  { key: "reservations", label: "Réservations", icon: Ticket },
  { key: "paiements", label: "Paiements & factures", icon: Receipt },
  { key: "pos", label: "Point de vente", icon: Store },
  { key: "imports", label: "Importer des données", icon: Upload },
] as const;

export default function PartnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<TravelCompany | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("vehicules");

  const load = () => {
    setLoading(true);
    setError("");
    fetchMyCompany()
      .then((c) => setCompany(c))
      .catch((e) => {
        if (e instanceof NotFoundError) setCompany(null);
        else setError(e instanceof Error ? e.message : "Erreur de chargement.");
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div className="min-h-screen bg-[var(--ml-soft)] px-4 pb-16 pt-8 dark:bg-[#0a0f22] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/travel" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ml-blue)] transition hover:underline dark:text-white/80">
          <ArrowLeft className="h-4 w-4" /> Retour à MaliLink Voyage
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-[var(--ml-text-soft)] dark:text-white/60">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !company ? (
          <RegisterCompany onCreated={setCompany} />
        ) : (
          <>
            <CompanyHeader company={company} />
            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Sections partenaire">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-current={tab === t.key}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    tab === t.key
                      ? "bg-[var(--ml-blue)] text-white"
                      : "bg-white text-[var(--ml-text)] hover:bg-[var(--ml-blue)]/10 dark:bg-white/5 dark:text-white/80"
                  }`}
                >
                  <t.icon className="h-4 w-4" aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="mt-6">
              {tab === "vehicules" && <VehiclesTab companyId={company.id} />}
              {tab === "lignes" && <RoutesTab companyId={company.id} />}
              {tab === "horaires" && <SchedulesTab companyId={company.id} />}
              {tab === "statistiques" && <StatsTab />}
              {tab === "reservations" && <BookingsTab />}
              {tab === "paiements" && <PaymentsTab />}
              {tab === "pos" && <PosTab companyId={company.id} />}
              {tab === "imports" && <ImportTab />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CompanyHeader({ company }: { company: TravelCompany }) {
  const initials = company.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--ml-border)] bg-gradient-to-br from-[var(--ml-blue)] to-[var(--ml-blue-2)] p-6 text-white sm:flex-row sm:items-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-xl font-black text-yellow-400">{initials}</div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black" style={{ color: "#ffffff" }}>{company.name}</h1>
          {company.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-bold text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Vérifié
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {Number(company.rating).toFixed(1)} ({company.rating_count} avis)</span>
          <span>Statut : {company.status === "active" ? "Actif" : company.status}</span>
        </div>
      </div>
    </div>
  );
}

function RegisterCompany({ onCreated }: { onCreated: (c: TravelCompany) => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.name.trim()) return setErr("Le nom de la compagnie est obligatoire.");
    setSaving(true);
    setErr("");
    try {
      onCreated(await createCompany(form));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--ml-blue)] text-yellow-400"><Building2 className="h-7 w-7" /></span>
        <h1 className="text-2xl font-black text-[var(--ml-blue)] dark:text-white">Devenez partenaire MaliLink Voyage</h1>
        <p className="mt-1 text-sm text-[var(--ml-text-soft)] dark:text-white/60">Créez votre compagnie et gérez vos véhicules, lignes, horaires et tarifs depuis un espace unique.</p>
      </div>
      <Card>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className={labelCls}>Nom de la compagnie *</label>
            <input id="name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Sonef Transport" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className={labelCls}>Téléphone</label>
              <input id="phone" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+223…" />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>Email</label>
              <input id="email" type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@…" />
            </div>
          </div>
          <div>
            <label htmlFor="desc" className={labelCls}>Description</label>
            <textarea id="desc" rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Votre activité, vos destinations…" />
          </div>
          {err && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{err}</p>}
          <button type="button" onClick={submit} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ml-blue)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--ml-blue-2)] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-gold)]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Créer ma compagnie
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Véhicules ---------- */
function VehiclesTab({ companyId }: { companyId: number }) {
  const [items, setItems] = useState<TravelVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", registration: "", mode_code: "bus", capacity: 50, has_ac: true, has_wifi: false, has_usb: false, has_tv: false, has_toilet: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => { setLoading(true); fetchVehicles().then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const submit = async () => {
    if (!form.name.trim()) return setMsg("Nom du véhicule obligatoire.");
    setSaving(true); setMsg("");
    try {
      await createVehicle({ ...form, travel_company_id: companyId });
      setForm({ ...form, name: "", registration: "" });
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur."); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--ml-blue)] dark:text-white">Ma flotte</h2>
        {loading ? <Card><p className="text-sm text-[var(--ml-text-soft)]">Chargement…</p></Card>
          : items.length === 0 ? <EmptyState icon={<Bus className="h-7 w-7" />} title="Aucun véhicule" message="Ajoutez votre premier véhicule pour composer vos lignes." />
          : items.map((v) => (
            <Card key={v.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--ml-blue)] dark:text-white">{MODE_EMOJI[v.mode_code] || "🚌"} {v.name}</p>
                  <p className="text-xs text-[var(--ml-text-soft)] dark:text-white/50">{v.registration || "—"} · {v.capacity} places</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {v.has_ac && <Badge>Clim</Badge>}{v.has_wifi && <Badge>Wi-Fi</Badge>}{v.has_usb && <Badge>USB</Badge>}{v.has_tv && <Badge>TV</Badge>}{v.has_toilet && <Badge>WC</Badge>}
                </div>
              </div>
            </Card>
          ))}
      </div>
      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--ml-blue)] dark:text-white"><Plus className="h-4 w-4" /> Ajouter un véhicule</h3>
        <div className="space-y-3">
          <input className={inputCls} placeholder="Nom (ex. Bus 001)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Nom du véhicule" />
          <input className={inputCls} placeholder="Immatriculation" value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} aria-label="Immatriculation" />
          <div className="grid grid-cols-2 gap-3">
            <select className={inputCls} value={form.mode_code} onChange={(e) => setForm({ ...form, mode_code: e.target.value })} aria-label="Type">
              {TRANSPORT_MODES.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
            </select>
            <input type="number" min={1} className={inputCls} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} aria-label="Capacité" />
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[var(--ml-text)] dark:text-white/80">
            {([["has_ac", "Clim"], ["has_wifi", "Wi-Fi"], ["has_usb", "USB"], ["has_tv", "TV"], ["has_toilet", "WC"]] as const).map(([k, l]) => (
              <label key={k} className="flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" className="accent-[var(--ml-blue)]" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} /> {l}
              </label>
            ))}
          </div>
          {msg && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{msg}</p>}
          <SubmitButton saving={saving} onClick={submit} label="Ajouter le véhicule" />
        </div>
      </Card>
    </div>
  );
}

/* ---------- Lignes ---------- */
function RoutesTab({ companyId }: { companyId: number }) {
  const [items, setItems] = useState<TravelRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState<GeoPlace | null>(null);
  const [destination, setDestination] = useState<GeoPlace | null>(null);
  const [form, setForm] = useState({ mode_code: "bus", duration_minutes: "", distance_km: "", services: "clim, wifi" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pubMsg, setPubMsg] = useState("");

  const load = () => { setLoading(true); fetchRoutes().then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const submit = async () => {
    if (!origin?.id || !destination?.id) return setMsg("Sélectionnez un lieu de départ et une destination dans la liste.");
    if (origin.id === destination.id) return setMsg("Départ et destination doivent différer.");
    setSaving(true); setMsg("");
    try {
      await createRoute({
        travel_company_id: companyId,
        mode_code: form.mode_code,
        origin_location_id: origin.id,
        destination_location_id: destination.id,
        // Vides → distance/durée calculées automatiquement côté serveur.
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setOrigin(null); setDestination(null);
      setForm({ ...form, duration_minutes: "", distance_km: "" });
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur."); } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--ml-blue)] dark:text-white">Mes lignes</h2>
        {loading ? <Card><p className="text-sm text-[var(--ml-text-soft)]">Chargement…</p></Card>
          : items.length === 0 ? <EmptyState icon={<RouteIcon className="h-7 w-7" />} title="Aucune ligne" message="Créez une ligne pour proposer des trajets à la vente." />
          : items.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--ml-blue)] dark:text-white">{MODE_EMOJI[r.mode_code] || "🚌"} {r.origin_city} → {r.destination_city}</p>
                  <p className="text-xs text-[var(--ml-text-soft)] dark:text-white/50">
                    {r.duration_minutes ? `${Math.floor(r.duration_minutes / 60)}h${String(r.duration_minutes % 60).padStart(2, "0")}` : "—"}
                    {r.distance_km ? ` · ${r.distance_km} km` : ""}{r.services?.length ? ` · ${r.services.join(", ")}` : ""}
                  </p>
                </div>
                <PublishToggle route={r} companyId={companyId} onChanged={load} onError={setPubMsg} />
              </div>
            </Card>
          ))}
        {pubMsg && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{pubMsg}</p>}
      </div>
      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--ml-blue)] dark:text-white"><Plus className="h-4 w-4" /> Ajouter une ligne</h3>
        <div className="space-y-3">
          <select className={inputCls} value={form.mode_code} onChange={(e) => setForm({ ...form, mode_code: e.target.value })} aria-label="Type de transport">
            {TRANSPORT_MODES.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
          </select>
          <GeoInput id="route-origin" label="Lieu de départ" placeholder="Ville, aéroport, gare… (partout dans le monde)" value={origin} onSelect={setOrigin} />
          <GeoInput id="route-destination" label="Destination" placeholder="Ville, aéroport, gare…" value={destination} onSelect={setDestination} />
          <p className="text-xs text-[var(--ml-text-soft)] dark:text-white/50">Distance et durée sont calculées automatiquement si vous les laissez vides.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Durée (min) — auto</label>
              <input type="number" min={1} className={inputCls} value={form.duration_minutes} placeholder="auto" onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Distance (km) — auto</label>
              <input type="number" min={0} className={inputCls} value={form.distance_km} placeholder="auto" onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Services (séparés par des virgules)</label>
            <input className={inputCls} value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="clim, wifi, repas" />
          </div>
          {msg && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{msg}</p>}
          <SubmitButton saving={saving} onClick={submit} label="Ajouter la ligne" />
        </div>
      </Card>
    </div>
  );
}

/* ---------- Horaires & tarifs ---------- */
function SchedulesTab({ companyId }: { companyId: number }) {
  const [routes, setRoutes] = useState<TravelRoute[]>([]);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [sched, setSched] = useState({ departure_time: "08:00", arrival_time: "12:00", seats_total: 50 });
  const [days, setDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 0]));
  const [price, setPrice] = useState({ seat_class: "standard", base_price: "", child_price: "" });
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRoutes().then((r) => { setRoutes(r); if (r[0]) setRouteId(r[0].id); }).catch(() => setRoutes([])); }, []);

  const selectedRoute = useMemo(() => routes.find((r) => r.id === routeId) || null, [routes, routeId]);

  const addSchedule = async () => {
    if (!routeId) return;
    setSaving(true); setMsg(""); setOk("");
    try {
      await createSchedule(routeId, { ...sched, days_of_week: Array.from(days).sort(), travel_company_id: companyId });
      setOk("Horaire ajouté.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur."); } finally { setSaving(false); }
  };
  const addPrice = async () => {
    if (!routeId) return setMsg("Sélectionnez une ligne.");
    if (!price.base_price) return setMsg("Prix de base obligatoire.");
    setSaving(true); setMsg(""); setOk("");
    try {
      await createPrice(routeId, { seat_class: price.seat_class, base_price: Number(price.base_price), child_price: price.child_price ? Number(price.child_price) : null, travel_company_id: companyId });
      setOk("Tarif ajouté.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erreur."); } finally { setSaving(false); }
  };

  if (routes.length === 0) {
    return <EmptyState icon={<Clock className="h-7 w-7" />} title="Créez d'abord une ligne" message="Les horaires et tarifs se rattachent à une ligne. Ajoutez une ligne dans l'onglet « Lignes »." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <label className={labelCls}>Ligne concernée</label>
        <select className={inputCls} value={routeId ?? ""} onChange={(e) => setRouteId(Number(e.target.value))} aria-label="Ligne">
          {routes.map((r) => <option key={r.id} value={r.id}>{MODE_EMOJI[r.mode_code] || "🚌"} {r.origin_city} → {r.destination_city}</option>)}
        </select>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Ajouter un horaire {selectedRoute ? `(${selectedRoute.origin_city} → ${selectedRoute.destination_city})` : ""}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Départ</label><input type="time" className={inputCls} value={sched.departure_time} onChange={(e) => setSched({ ...sched, departure_time: e.target.value })} /></div>
              <div><label className={labelCls}>Arrivée</label><input type="time" className={inputCls} value={sched.arrival_time} onChange={(e) => setSched({ ...sched, arrival_time: e.target.value })} /></div>
            </div>
            <div>
              <label className={labelCls}>Jours de circulation</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const on = days.has(d.v);
                  return (
                    <button key={d.v} type="button" onClick={() => setDays((p) => { const n = new Set(p); if (n.has(d.v)) n.delete(d.v); else n.add(d.v); return n; })}
                      aria-pressed={on}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${on ? "bg-[var(--ml-blue)] text-white" : "bg-[var(--ml-soft)] text-[var(--ml-text-soft)] dark:bg-white/5 dark:text-white/50"}`}>
                      {d.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <div><label className={labelCls}>Places</label><input type="number" min={1} className={inputCls} value={sched.seats_total} onChange={(e) => setSched({ ...sched, seats_total: Number(e.target.value) })} /></div>
            <SubmitButton saving={saving} onClick={addSchedule} label="Ajouter l'horaire" />
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-bold text-[var(--ml-blue)] dark:text-white">Ajouter un tarif</h3>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Classe</label>
              <select className={inputCls} value={price.seat_class} onChange={(e) => setPrice({ ...price, seat_class: e.target.value })}>
                {["standard", "vip", "business", "economy"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Prix adulte (FCFA)</label><input type="number" min={0} className={inputCls} value={price.base_price} onChange={(e) => setPrice({ ...price, base_price: e.target.value })} placeholder="6000" /></div>
              <div><label className={labelCls}>Prix enfant</label><input type="number" min={0} className={inputCls} value={price.child_price} onChange={(e) => setPrice({ ...price, child_price: e.target.value })} placeholder="3000" /></div>
            </div>
            <SubmitButton saving={saving} onClick={addPrice} label="Ajouter le tarif" />
          </div>
        </Card>
      </div>
      {msg && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{msg}</p>}
      {ok && <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> {ok}</p>}
    </div>
  );
}

/* ---------- Publication catalogue (Lot A) ---------- */
function PublishToggle({ route, companyId, onChanged, onError }: {
  route: TravelRoute; companyId: number; onChanged: () => void; onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const published = !!route.published;
  const toggle = async () => {
    setBusy(true); onError("");
    try {
      if (published) await unpublishRoute(route.id, companyId);
      else await publishRoute(route.id, companyId);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur de publication.");
    } finally { setBusy(false); }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={published}
      title={published ? "Retirer de Marketplace" : "Publier dans Marketplace"}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-gold)] ${
        published
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-[var(--ml-blue)] text-white hover:bg-[var(--ml-blue-2)]"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : published ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
      {published ? "Publié" : "Publier"}
    </button>
  );
}

/* ---------- petits composants ---------- */
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-[var(--ml-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ml-text-soft)] dark:bg-white/10 dark:text-white/60">{children}</span>;
}
function SubmitButton({ saving, onClick, label }: { saving: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={saving}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ml-blue)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--ml-blue-2)] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-gold)]">
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {label}
    </button>
  );
}
