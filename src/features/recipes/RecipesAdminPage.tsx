import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";

type Item = { id: string; name: string; unit: string; category: string };
type Ingredient = {
  id: string;
  quantity: string; // backend sends as string/decimal
  unitOverride?: string | null;
  item: Item;
};
type Recipe = {
  id: string;
  title: string;
  type: "MEAL" | "DESSERT";
  tags: string[];
  notes: string | null;
  text: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients?: Ingredient[];
};

export default function RecipesAdminPage() {
  const qc = useQueryClient();

  // ---- filters & selection ----
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "MEAL" | "DESSERT">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- list query ----
  const listQ = useQuery({
    queryKey: ["recipes", { q, typeFilter }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();
      if (typeFilter) params.type = typeFilter;
      const query = new URLSearchParams(params).toString();
      const { data } = await api.get("/recipes" + (query ? `?${query}` : ""));

      // tolerate {recipes:[...]} or {items:[...]} or []:
      const arr = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.recipes)
          ? (data as any).recipes
          : Array.isArray((data as any)?.items)
            ? (data as any).items
            : [];

      return arr as Recipe[];
    },
  });

  // always render with an array
  const list: Recipe[] = Array.isArray(listQ.data) ? listQ.data : [];

  // pre-select first on load/refresh
  useEffect(() => {
    if (!selectedId && list.length) setSelectedId(list[0].id);
  }, [list, selectedId]);

  // ---- detail query ----
  const detailQ = useQuery({
    queryKey: ["recipe", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await api.get<Recipe>(`/recipes/${selectedId}`);
      return data;
    },
  });

  // ---- items (for ingredient selector) ----
  const itemsQ = useQuery({
    queryKey: ["items"],
    queryFn: async () => (await api.get<Item[]>("/items")).data,
  });

  // ---- mutations ----
  const createRecipe = useMutation({
    mutationFn: async (payload: {
      title: string;
      type: "MEAL" | "DESSERT";
      tags?: string[];
      notes?: string | null;
      text?: string | null;
    }) => (await api.post<Recipe>("/recipes", payload)).data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      setSelectedId(r.id);
    },
  });

  const patchRecipe = useMutation({
    mutationFn: async (payload: {
      id: string;
      title?: string;
      type?: "MEAL" | "DESSERT";
      tags?: string[];
      notes?: string | null;
      text?: string | null;
    }) => (await api.patch<Recipe>(`/recipes/${payload.id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipe", selectedId] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/recipes/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      setSelectedId(null);
    },
  });

  const addIngredient = useMutation({
    mutationFn: async (payload: {
      recipeId: string;
      itemId: string;
      quantity: number | string;
      unitOverride?: string | null;
    }) =>
      (
        await api.post(`/recipes/${payload.recipeId}/ingredients`, {
          itemId: payload.itemId,
          quantity: payload.quantity,
          unitOverride: payload.unitOverride ?? null,
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipe", selectedId] }),
  });

  const patchIngredient = useMutation({
    mutationFn: async (payload: {
      recipeId: string;
      ingredientId: string;
      quantity?: number | string;
      unitOverride?: string | null;
    }) =>
      (
        await api.patch(
          `/recipes/${payload.recipeId}/ingredients/${payload.ingredientId}`,
          { quantity: payload.quantity, unitOverride: payload.unitOverride },
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipe", selectedId] }),
  });

  const deleteIngredient = useMutation({
    mutationFn: async (payload: { recipeId: string; ingredientId: string }) =>
      (
        await api.delete(
          `/recipes/${payload.recipeId}/ingredients/${payload.ingredientId}`,
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipe", selectedId] }),
  });

  // ---- create form ----
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"MEAL" | "DESSERT">("MEAL");
  const [newTags, setNewTags] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newText, setNewText] = useState("");

  const onCreate = async () => {
    try {
      const payload = {
        title: newTitle.trim(),
        type: newType,
        tags: splitTags(newTags),
        notes: newNotes.trim() || undefined,
        text: newText.trim() || undefined,
      };
      if (!payload.title) return alert("Title required");
      const r = await createRecipe.mutateAsync(payload);
      setNewTitle("");
      setNewTags("");
      setNewNotes("");
      setNewText("");
      setNewType("MEAL");
      setSelectedId(r.id);
    } catch (e: any) {
      alert(e?.response?.data?.error || "create_recipe_failed");
    }
  };

  return (
    <div className="row g-4">
      {/* LEFT: list & create */}
      <div className="col-md-4">
        <h4>Recipes</h4>

        {/* filters */}
        <div className="mb-3">
          <input
            className="form-control mb-2"
            placeholder="Search title..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="">Any type</option>
            <option value="MEAL">Meal</option>
            <option value="DESSERT">Dessert</option>
          </select>
        </div>

        <div className="list-group">
          {list.map((r) => (
            <button
              key={r.id}
              className={`list-group-item list-group-item-action ${
                r.id === selectedId ? "active" : ""
              }`}
              onClick={() => setSelectedId(r.id)}
            >
              <div className="d-flex justify-content-between">
                <div>
                  <div>
                    <strong>{r.title}</strong>
                  </div>
                  <small className="text-muted">{r.type}</small>
                </div>
                <small className="text-muted">
                  {new Date(r.updatedAt).toLocaleDateString()}
                </small>
              </div>
            </button>
          ))}
          {list.length === 0 && (
            <div className="text-muted p-2">No recipes.</div>
          )}
        </div>

        <div className="card mt-3">
          <div className="card-body">
            <h6 className="card-title mb-3">Create recipe</h6>
            <div className="vstack gap-2">
              <input
                className="form-control"
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <select
                className="form-select"
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
              >
                <option value="MEAL">Meal</option>
                <option value="DESSERT">Dessert</option>
              </select>
              <input
                className="form-control"
                placeholder="Tags (comma separated)"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
              />
              <textarea
                className="form-control"
                placeholder="Notes (optional)"
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
              <textarea
                className="form-control"
                placeholder="Text / Steps (optional)"
                rows={3}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={onCreate}
                disabled={createRecipe.isPending}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: detail & ingredients */}
      <div className="col-md-8">
        {detailQ.data ? (
          <RecipeEditor
            recipe={detailQ.data}
            onSave={async (patch) => {
              try {
                await patchRecipe.mutateAsync({
                  id: detailQ.data!.id,
                  ...patch,
                });
              } catch (e: any) {
                alert(e?.response?.data?.error || "update_recipe_failed");
              }
            }}
            onDelete={async () => {
              if (!confirm("Delete this recipe?")) return;
              try {
                await deleteRecipe.mutateAsync(detailQ.data!.id);
              } catch (e: any) {
                alert(e?.response?.data?.error || "delete_recipe_failed");
              }
            }}
            items={itemsQ.data || []}
            onAddIngredient={async (payload) => {
              try {
                await addIngredient.mutateAsync({
                  recipeId: detailQ.data!.id,
                  ...payload,
                });
              } catch (e: any) {
                alert(e?.response?.data?.error || "add_ingredient_failed");
              }
            }}
            onPatchIngredient={async (ingredientId, patch) => {
              try {
                await patchIngredient.mutateAsync({
                  recipeId: detailQ.data!.id,
                  ingredientId,
                  ...patch,
                });
              } catch (e: any) {
                alert(e?.response?.data?.error || "update_ingredient_failed");
              }
            }}
            onDeleteIngredient={async (ingredientId) => {
              try {
                await deleteIngredient.mutateAsync({
                  recipeId: detailQ.data!.id,
                  ingredientId,
                });
              } catch (e: any) {
                alert(e?.response?.data?.error || "delete_ingredient_failed");
              }
            }}
          />
        ) : (
          <div className="text-muted">Select a recipe to edit.</div>
        )}
      </div>
    </div>
  );
}

function RecipeEditor({
  recipe,
  onSave,
  onDelete,
  items,
  onAddIngredient,
  onPatchIngredient,
  onDeleteIngredient,
}: {
  recipe: Recipe;
  onSave: (
    patch: Partial<Pick<Recipe, "title" | "type" | "tags" | "notes" | "text">>,
  ) => Promise<void>;
  onDelete: () => Promise<void>;
  items: Item[];
  onAddIngredient: (p: {
    itemId: string;
    quantity: number | string;
    unitOverride?: string | null;
  }) => Promise<void>;
  onPatchIngredient: (
    ingredientId: string,
    patch: { quantity?: number | string; unitOverride?: string | null },
  ) => Promise<void>;
  onDeleteIngredient: (ingredientId: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(recipe.title);
  const [type, setType] = useState<"MEAL" | "DESSERT">(recipe.type);
  const [tagsText, setTagsText] = useState(recipe.tags.join(", "));
  const [notes, setNotes] = useState(recipe.notes || "");
  const [text, setText] = useState(recipe.text || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(recipe.title);
    setType(recipe.type);
    setTagsText(recipe.tags.join(", "));
    setNotes(recipe.notes || "");
    setText(recipe.text || "");
  }, [recipe.id]); // reload when selection changes

  const changed =
    title.trim() !== recipe.title ||
    type !== recipe.type ||
    tagsTextNormalize(tagsText) !== recipe.tags.join(",") ||
    (notes || "") !== (recipe.notes || "") ||
    (text || "") !== (recipe.text || "");

  const save = async () => {
    setBusy(true);
    try {
      await onSave({
        title: title.trim(),
        type,
        tags: splitTags(tagsText),
        notes: notes.trim() || null,
        text: text.trim() || null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vstack gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Edit: {recipe.title}</h4>
        <div className="btn-group">
          <button
            className="btn btn-primary"
            disabled={!changed || busy}
            onClick={save}
          >
            Save
          </button>
          <button className="btn btn-outline-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="row g-2">
        <div className="col-md-6">
          <label className="form-label">Title</label>
          <input
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="MEAL">Meal</option>
            <option value="DESSERT">Dessert</option>
          </select>
        </div>
        <div className="col-12">
          <label className="form-label">Tags</label>
          <input
            className="form-control"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="tag1, tag2"
          />
        </div>
        <div className="col-12">
          <label className="form-label">Notes</label>
          <textarea
            className="form-control"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="col-12">
          <label className="form-label">Text / Steps</label>
          <textarea
            className="form-control"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>

      <hr />

      <IngredientsPanel
        ingredients={recipe.ingredients || []}
        items={items}
        onAdd={onAddIngredient}
        onPatch={onPatchIngredient}
        onDelete={onDeleteIngredient}
      />
    </div>
  );
}

function IngredientsPanel({
  ingredients,
  items,
  onAdd,
  onPatch,
  onDelete,
}: {
  ingredients: Ingredient[];
  items: Item[];
  onAdd: (p: {
    itemId: string;
    quantity: number | string;
    unitOverride?: string | null;
  }) => Promise<void>;
  onPatch: (
    ingredientId: string,
    patch: { quantity?: number | string; unitOverride?: string | null },
  ) => Promise<void>;
  onDelete: (ingredientId: string) => Promise<void>;
}) {
  // add row state
  const [addItemId, setAddItemId] = useState("");
  const [addQty, setAddQty] = useState<number | string>(1);
  const [addUnitOverride, setAddUnitOverride] = useState("");

  const options = useMemo(
    () => items.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })),
    [items],
  );

  const add = async () => {
    if (!addItemId) return;
    await onAdd({
      itemId: addItemId,
      quantity: addQty,
      unitOverride: addUnitOverride.trim() || null,
    });
    setAddItemId("");
    setAddQty(1);
    setAddUnitOverride("");
  };

  return (
    <div>
      <h5>Ingredients</h5>
      <div className="d-flex gap-2">
        <select
          className="form-select"
          value={addItemId}
          onChange={(e) => setAddItemId(e.target.value)}
        >
          <option value="">Select item…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          className="form-control"
          type="number"
          step="0.1"
          min="0"
          value={addQty as any}
          onChange={(e) => setAddQty(Number(e.target.value))}
        />
        <input
          className="form-control"
          placeholder="Unit override (optional)"
          value={addUnitOverride}
          onChange={(e) => setAddUnitOverride(e.target.value)}
        />
        <button className="btn btn-primary" onClick={add} disabled={!addItemId}>
          Add
        </button>
      </div>

      <ul className="list-group mt-3">
        {ingredients.map((ing) => (
          <IngredientRow
            key={ing.id}
            ing={ing}
            onPatch={onPatch}
            onDelete={onDelete}
          />
        ))}
        {ingredients.length === 0 && (
          <li className="list-group-item text-muted">No ingredients yet.</li>
        )}
      </ul>
    </div>
  );
}

function IngredientRow({
  ing,
  onPatch,
  onDelete,
}: {
  ing: Ingredient;
  onPatch: (
    ingredientId: string,
    patch: { quantity?: number | string; unitOverride?: string | null },
  ) => Promise<void>;
  onDelete: (ingredientId: string) => Promise<void>;
}) {
  const [qty, setQty] = useState<string>(String(ing.quantity));
  const [override, setOverride] = useState<string>(ing.unitOverride || "");
  const [busy, setBusy] = useState(false);

  const changed =
    qty.trim() !== String(ing.quantity) ||
    (override.trim() || "") !== (ing.unitOverride || "");

  const save = async () => {
    setBusy(true);
    try {
      await onPatch(ing.id, {
        quantity: qty.trim(),
        unitOverride: override.trim() || null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <div>
          <strong>{ing.item.name}</strong>
        </div>
        <div className="small text-muted">Base unit: {ing.item.unit}</div>
      </div>
      <div className="d-flex gap-2">
        <input
          className="form-control"
          style={{ width: 100 }}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <input
          className="form-control"
          style={{ width: 150 }}
          placeholder="Unit override"
          value={override}
          onChange={(e) => setOverride(e.target.value)}
        />
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
            onClick={() => onDelete(ing.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
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
