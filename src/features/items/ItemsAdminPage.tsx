import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";

type Item = {
  id: string;
  houseId: string;
  name: string;
  category: string;
  unit: string;
  tags: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

// Locked options for selects
const CATEGORY_OPTIONS = [
  "kitchen",
  "pantry",
  "fridge",
  "freezer",
  "cleaning",
  "bathroom",
  "laundry",
  "other",
] as const;

const UNIT_OPTIONS = [
  "pcs", // pieces
  "g",
  "kg",
  "ml",
  "L",
  "tbsp",
  "tsp",
  "pack",
  "box",
] as const;

export default function ItemsAdminPage() {
  const qc = useQueryClient();

  // filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);

  // list query
  const itemsQ = useQuery({
    queryKey: ["items", { search, categoryFilter, showArchived }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (categoryFilter) params.set("category", categoryFilter);
      if (showArchived) params.set("archived", "true");
      const { data } = await api.get<Item[]>(
        "/items" + (params.size ? `?${params}` : ""),
      );
      return Array.isArray(data) ? data : [];
    },
  });

  const items = useMemo(() => itemsQ.data || [], [itemsQ.data]);

  // mutations
  const createMut = useMutation({
    mutationFn: async (p: {
      name: string;
      category: string;
      unit: string;
      tags?: string[];
    }) => (await api.post<Item>("/items", p)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });

  const updateMut = useMutation({
    mutationFn: async (p: {
      id: string;
      patch: Partial<Pick<Item, "name" | "category" | "unit" | "tags">>;
    }) => (await api.patch<Item>(`/items/${p.id}`, p.patch)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/items/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });

  // create form state (defaults to first option so user always picks from dropdown)
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<
    (typeof CATEGORY_OPTIONS)[number]
  >(CATEGORY_OPTIONS[0]);
  const [newUnit, setNewUnit] = useState<(typeof UNIT_OPTIONS)[number]>(
    UNIT_OPTIONS[0],
  );
  const [newTags, setNewTags] = useState("");

  const onCreate = async () => {
    try {
      const name = newName.trim();
      if (!name) return alert("Name required");

      // Category + Unit ALWAYS come from controlled <select> values
      const category = newCategory;
      const unit = newUnit;

      await createMut.mutateAsync({
        name,
        category,
        unit,
        tags: splitTags(newTags),
      });

      setNewName("");
      setNewCategory(CATEGORY_OPTIONS[0]);
      setNewUnit(UNIT_OPTIONS[0]);
      setNewTags("");
    } catch (e: any) {
      alert(e?.response?.data?.error || "add_item_failed");
    }
  };

  return (
    <div className="vstack gap-3">
      <h4>Global Items</h4>

      {/* Filters */}
      <div className="row g-2 align-items-end">
        <div className="col-md-5">
          <label className="form-label">Search</label>
          <input
            className="form-control"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Category</label>
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3 form-check" style={{ marginTop: 32 }}>
          <input
            id="archived"
            type="checkbox"
            className="form-check-input"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <label htmlFor="archived" className="form-check-label">
            Show archived
          </label>
        </div>
      </div>

      {/* Create Card */}
      <div className="card">
        <div className="card-body">
          <h6 className="card-title mb-3">Add item</h6>
          <div className="row g-2">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(
                    e.target.value as (typeof CATEGORY_OPTIONS)[number],
                  )
                }
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={newUnit}
                onChange={(e) =>
                  setNewUnit(e.target.value as (typeof UNIT_OPTIONS)[number])
                }
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <input
                className="form-control"
                placeholder="tags (a,b,c)"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
              />
            </div>
            <div className="col-md-1 d-grid">
              <button
                className="btn btn-primary"
                onClick={onCreate}
                disabled={createMut.isPending}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th style={{ width: 280 }}>Name</th>
              <th style={{ width: 220 }}>Category</th>
              <th style={{ width: 140 }}>Unit</th>
              <th>Tags</th>
              <th className="text-end" style={{ width: 220 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <ItemRow
                key={it.id}
                it={it}
                onUpdate={(patch) =>
                  updateMut.mutateAsync({ id: it.id, patch })
                }
                onDelete={() => deleteMut.mutateAsync(it.id)}
              />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="text-muted">No items.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemRow({
  it,
  onUpdate,
  onDelete,
}: {
  it: Item;
  onUpdate: (
    patch: Partial<Pick<Item, "name" | "category" | "unit" | "tags">>,
  ) => Promise<any>;
  onDelete: () => Promise<any>;
}) {
  const [name, setName] = useState(it.name);
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>(
    // if item has an old value not in the list, fall back to "other"
    (CATEGORY_OPTIONS as readonly string[]).includes(it.category)
      ? (it.category as any)
      : "other",
  );
  const [unit, setUnit] = useState<(typeof UNIT_OPTIONS)[number]>(
    (UNIT_OPTIONS as readonly string[]).includes(it.unit)
      ? (it.unit as any)
      : "pcs",
  );
  const [tagsText, setTagsText] = useState(it.tags.join(", "));
  const [busy, setBusy] = useState(false);

  const changed =
    name.trim() !== it.name ||
    category !== (it.category as any) ||
    unit !== (it.unit as any) ||
    tagsTextNormalize(tagsText) !== it.tags.join(",");

  const save = async () => {
    setBusy(true);
    try {
      await onUpdate({
        name: name.trim(),
        category,
        unit,
        tags: splitTags(tagsText),
      });
    } catch (e: any) {
      alert(e?.response?.data?.error || "update_item_failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className={it.isArchived ? "table-secondary" : ""}>
      <td>
        <input
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </td>
      <td>
        <select
          className="form-select"
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as (typeof CATEGORY_OPTIONS)[number])
          }
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="form-select"
          value={unit}
          onChange={(e) =>
            setUnit(e.target.value as (typeof UNIT_OPTIONS)[number])
          }
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="form-control"
          placeholder="a, b, c"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
        />
      </td>
      <td className="text-end">
        <div className="btn-group">
          <button
            className="btn btn-sm btn-outline-primary"
            disabled={!changed || busy}
            onClick={save}
          >
            Save
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => {
              if (!confirm("Archive this item?")) return;
              onDelete().catch(() => alert("remove_item_failed"));
            }}
          >
            Archive
          </button>
        </div>
      </td>
    </tr>
  );
}

// helpers
function splitTags(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
function tagsTextNormalize(s: string) {
  return splitTags(s).join(",");
}
