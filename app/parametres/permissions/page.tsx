"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authFetch } from "../../lib/api";
import { ACTION_COLUMN, type PermissionRow } from "../../lib/permissions";

type Employee = { id: number; fullname: string; role: string; email?: string };
type Registry = { actions: string[]; submodules: Record<string, string[]>; labels: Record<string, string> };
type PermMap = Record<string, Record<string, boolean>>;

const ACTION_LABELS: Record<string, string> = {
  view: "Voir", create: "Créer", update: "Modifier", delete: "Supprimer", import: "Importer",
  export: "Exporter", print: "Imprimer", validate: "Valider", cancel: "Annuler", share: "Partager",
};
const FULL_ROLES = ["super_admin", "admin", "administrateur", "manager", "direction", "directeur", "gerant"];
const READONLY_ROLES = ["lecture_seule", "readonly", "client", "customer", "invite"];
const WRITE_ACTIONS = ["view", "create", "update", "export", "print"];

export default function PermissionsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [group, setGroup] = useState<string>("");
  const [perms, setPerms] = useState<PermMap>({});
  const [copyFrom, setCopyFrom] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch("/users").then(async (r) => {
      if (r.ok) {
        const rows = await r.json();
        setEmployees(rows.map((u: Record<string, unknown>) => ({ id: Number(u.id), fullname: String(u.fullname || ""), role: String(u.role || ""), email: String(u.email || "") })));
      }
    });
    authFetch("/rbac/registry").then(async (r) => {
      if (r.ok) { const reg = (await r.json()) as Registry; setRegistry(reg); setGroup(Object.keys(reg.submodules)[0] || ""); }
    });
  }, []);

  // Toutes les clés module + sous-modules (parent.enfant).
  const allKeys = useMemo(() => {
    if (!registry) return [] as string[];
    const keys: string[] = [];
    for (const parent of Object.keys(registry.submodules)) {
      keys.push(parent);
      for (const sub of registry.submodules[parent]) keys.push(`${parent}.${sub}`);
    }
    return keys;
  }, [registry]);

  const rowsFromApi = useCallback((rows: PermissionRow[], keys: string[]): PermMap => {
    const map: PermMap = {};
    const actions = registry?.actions || [];
    for (const key of keys) {
      const row = rows.find((p) => p.module_key === key);
      map[key] = {};
      for (const a of actions) {
        const col = ACTION_COLUMN[a];
        map[key][a] = row ? row[col] === true : false;
      }
    }
    return map;
  }, [registry]);

  const loadEmployee = useCallback(async (id: string) => {
    setMsg("");
    if (!id || !registry) return;
    const res = await authFetch(`/company/users/${id}/permissions`);
    if (!res.ok) { setMsg("Impossible de charger les droits."); return; }
    const data = await res.json();
    setSelectedRole(data.user?.role || "");
    setPerms(rowsFromApi(data.permissions || [], allKeys));
  }, [registry, allKeys, rowsFromApi]);

  useEffect(() => { if (selectedId) loadEmployee(selectedId); }, [selectedId, loadEmployee]);

  const setCell = (key: string, action: string, val: boolean) => {
    setPerms((prev) => ({ ...prev, [key]: { ...prev[key], [action]: val } }));
  };

  const applyToAll = (fn: (key: string, action: string) => boolean) => {
    if (!registry) return;
    const map: PermMap = {};
    for (const key of allKeys) {
      map[key] = {};
      for (const a of registry.actions) map[key][a] = fn(key, a);
    }
    setPerms(map);
  };

  const resetFromRole = () => {
    const r = (selectedRole || "").toLowerCase();
    applyToAll((key, action) => {
      if (FULL_ROLES.includes(r)) return true;
      if (READONLY_ROLES.includes(r)) return action === "view";
      return WRITE_ACTIONS.includes(action);
    });
    setMsg(`Droits réinitialisés selon le rôle « ${selectedRole || "standard"} ».`);
  };

  const copyFromEmployee = async () => {
    if (!copyFrom) return;
    const res = await authFetch(`/company/users/${copyFrom}/permissions`);
    if (!res.ok) { setMsg("Copie impossible."); return; }
    const data = await res.json();
    setPerms(rowsFromApi(data.permissions || [], allKeys));
    setMsg("Droits copiés. Pensez à enregistrer.");
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true); setMsg("");
    const payload = {
      permissions: allKeys.map((key) => ({
        module_key: key,
        ...Object.fromEntries((registry?.actions || []).map((a) => [a, !!perms[key]?.[a]])),
      })),
    };
    const res = await authFetch(`/company/users/${selectedId}/permissions`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setMsg(data?.error || "Erreur d'enregistrement."); return; }
    setMsg(`✅ Droits enregistrés (${data.count} entrées).`);
    window.dispatchEvent(new CustomEvent("malilink-permissions-updated"));
  };

  const groupRows = useMemo(() => {
    if (!registry || !group) return [] as string[];
    return [group, ...registry.submodules[group].map((s) => `${group}.${s}`)];
  }, [registry, group]);

  const label = (key: string) => {
    if (!key.includes(".")) return registry?.labels[key] || key;
    return "— " + key.split(".")[1].replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Droits & permissions</h1>
          <Link href="/dashboard" className="font-bold text-blue-700">← Tableau de bord</Link>
        </div>
        <p className="text-gray-600">Gérez précisément ce que chaque employé peut voir et faire, module par module et sous-module par sous-module.</p>

        {msg && <div className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-900">{msg}</div>}

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Employé</label>
              <select className="w-full rounded-xl border border-gray-300 p-3 text-gray-900" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">Choisir un employé</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.fullname} — {e.role}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Rôle</label>
              <input readOnly className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-700" value={selectedRole || "—"} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Copier les droits de</label>
              <div className="flex gap-2">
                <select className="w-full rounded-xl border border-gray-300 p-3 text-gray-900" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} disabled={!selectedId}>
                  <option value="">—</option>
                  {employees.filter((e) => String(e.id) !== selectedId).map((e) => <option key={e.id} value={e.id}>{e.fullname}</option>)}
                </select>
                <button onClick={copyFromEmployee} disabled={!copyFrom} className="shrink-0 rounded-xl bg-gray-800 px-4 font-bold text-white disabled:opacity-50">Copier</button>
              </div>
            </div>
          </div>

          {selectedId && registry && (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => applyToAll(() => true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Tout autoriser</button>
                <button onClick={() => applyToAll(() => false)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Tout refuser</button>
                <button onClick={() => applyToAll((_, a) => a === "view")} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-black text-black">Lecture seule</button>
                <button onClick={resetFromRole} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white">Réinitialiser selon le rôle</button>
              </div>

              <div className="mt-5">
                <label className="mb-1 block text-sm font-semibold text-gray-700">Module</label>
                <select className="w-full max-w-xs rounded-xl border border-gray-300 p-3 text-gray-900" value={group} onChange={(e) => setGroup(e.target.value)}>
                  {Object.keys(registry.submodules).map((g) => <option key={g} value={g}>{registry.labels[g] || g}</option>)}
                </select>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="sticky left-0 bg-white p-2">Module / sous-module</th>
                      {registry.actions.map((a) => <th key={a} className="p-2 text-center">{ACTION_LABELS[a] || a}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((key) => (
                      <tr key={key} className="border-t border-gray-100">
                        <td className={`sticky left-0 bg-white p-2 font-semibold ${key.includes(".") ? "pl-4 text-gray-600" : "text-gray-900"}`}>{label(key)}</td>
                        {registry.actions.map((a) => (
                          <td key={a} className="p-2 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-emerald-600"
                              checked={!!perms[key]?.[a]}
                              onChange={(e) => setCell(key, a, e.target.checked)}
                              aria-label={`${label(key)} — ${ACTION_LABELS[a] || a}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button onClick={save} disabled={saving} className="rounded-xl bg-yellow-500 px-6 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-60">
                  {saving ? "Enregistrement…" : "Enregistrer les droits"}
                </button>
                <button onClick={() => loadEmployee(selectedId)} className="rounded-xl border border-gray-300 px-4 py-3 font-bold text-gray-700">Recharger</button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
