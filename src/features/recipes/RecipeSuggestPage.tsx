import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";

type Item = { id: string; name: string; unit: string; category: string };
type Recipe = {
  id: string;
  title: string;
  type: "MEAL" | "DESSERT";
  tags?: string[];
  notes?: string | null;
  text?: string | null;
  match?: { matched: number; total: number; missing: number; matchPct: number };
  ingredients?: Array<{
    id: string;
    quantity: string; // decimal-as-string from backend
    unitOverride?: string | null;
    item: Item;
  }>;
};

export default function RecipeSuggestPage() {
  // fetch available items
  const itemsQ = useQuery({
    queryKey: ["items"],
    queryFn: async () => (await api.get<Item[]>("/items")).data,
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<Recipe[] | null>(null);
  const [missing, setMissing] = useState<number>(0);
  const [type, setType] = useState<"" | "MEAL" | "DESSERT">("");

  // group items by category for checkbox list
  const grouped = useMemo(() => {
    const byCat: Record<string, Item[]> = {};
    (itemsQ.data || []).forEach((i) => {
      byCat[i.category] = byCat[i.category] || [];
      byCat[i.category].push(i);
    });
    // optional: keep categories stable
    Object.keys(byCat).forEach((k) =>
      byCat[k].sort((a, b) => a.name.localeCompare(b.name)),
    );
    return byCat;
  }, [itemsQ.data]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const doSuggest = async () => {
    const body: any = { items: selected };
    if (type) body.type = type;
    if (missing) body.missing = missing;
    const { data } = await api.post<Recipe[]>("/recipes/suggest", body);
    setResults(Array.isArray(data) ? data : []);
  };

  return (
    <div className="row g-4">
      {/* LEFT: pick available items + filters */}
      <div className="col-md-4">
        <h5>Available items</h5>
        <div className="mb-3">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="">Any</option>
            <option value="MEAL">Meal</option>
            <option value="DESSERT">Dessert</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Allow missing</label>
          <input
            type="number"
            className="form-control"
            min={0}
            value={missing}
            onChange={(e) => setMissing(Number(e.target.value))}
          />
        </div>

        {Object.entries(grouped).map(([cat, arr]) => (
          <div key={cat} className="mb-2">
            <div className="fw-bold">{cat}</div>
            {arr.map((i) => (
              <div key={i.id} className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={i.id}
                  checked={selected.includes(i.id)}
                  onChange={() => toggle(i.id)}
                />
                <label className="form-check-label" htmlFor={i.id}>
                  {i.name} <small className="text-muted">({i.unit})</small>
                </label>
              </div>
            ))}
          </div>
        ))}

        <button
          className="btn btn-primary mt-2"
          disabled={!selected.length}
          onClick={doSuggest}
        >
          Suggest
        </button>
      </div>

      {/* RIGHT: results */}
      <div className="col-md-8">
        <h5>Results</h5>

        {!results ? (
          <div className="text-muted">Pick items and click Suggest.</div>
        ) : results.length === 0 ? (
          <div className="text-muted">No matching recipes.</div>
        ) : (
          <div className="vstack gap-3">
            {results.map((r) => (
              <div key={r.id} className="card">
                <div className="card-body">
                  {/* Header row */}
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h5 className="card-title mb-1">{r.title}</h5>
                      <span className="badge text-bg-light me-2">{r.type}</span>
                      {Array.isArray(r.tags) &&
                        r.tags.map((t) => (
                          <span
                            key={t}
                            className="badge text-bg-secondary me-1"
                          >
                            {t}
                          </span>
                        ))}
                    </div>
                    {r.match && (
                      <span className="badge text-bg-primary">
                        {r.match.matched}/{r.match.total} matched
                        {typeof r.match.matchPct === "number"
                          ? ` (${Math.round(r.match.matchPct)}%)`
                          : ""}
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {r.notes ? (
                    <div className="mt-2">
                      <div className="fw-semibold">Notes</div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{r.notes}</div>
                    </div>
                  ) : null}

                  {/* Steps / Text */}
                  {r.text ? (
                    <div className="mt-3">
                      <div className="fw-semibold">Steps</div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{r.text}</div>
                    </div>
                  ) : null}

                  {/* Ingredients */}
                  {r.ingredients && r.ingredients.length > 0 && (
                    <div className="mt-3">
                      <div className="fw-semibold">Ingredients</div>
                      <ul className="mb-0 mt-2">
                        {r.ingredients.map((ing) => (
                          <li key={ing.id}>
                            {ing.item.name} — {ing.quantity}{" "}
                            {ing.unitOverride
                              ? ing.unitOverride
                              : ing.item.unit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
