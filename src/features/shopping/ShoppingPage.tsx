import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthProvider";

type List = {
  id: string;
  title: string;
  isArchived: boolean;
  updatedAt: string;
  _count?: { items: number };
};
type Item = { id: string; name: string; unit: string; category: string };
type Line = {
  id: string;
  listId: string;
  itemId: string;
  quantity: string;
  unitOverride?: string | null;
  note?: string | null;
  item: Item;
};

export default function ShoppingPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const listsQ = useQuery({
    queryKey: ["lists"],
    queryFn: async () => (await api.get<List[]>("/shopping-lists")).data,
  });

  const itemsQ = useQuery({
    queryKey: ["items"],
    queryFn: async () => (await api.get<Item[]>("/items")).data,
  });

  const selectedList = useQuery({
    queryKey: ["list", selectedListId],
    enabled: !!selectedListId,
    queryFn: async () =>
      (await api.get(`/shopping-lists/${selectedListId}`)).data as {
        id: string;
        title: string;
        items: Line[];
      },
  });

  useEffect(() => {
    if (!selectedListId && listsQ.data?.length)
      setSelectedListId(listsQ.data[0].id);
  }, [listsQ.data, selectedListId]);

  const createList = useMutation({
    mutationFn: async (title: string) =>
      (await api.post("/shopping-lists", { title })).data as List,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] }),
  });

  const addLine = useMutation({
    mutationFn: async (payload: {
      listId: string;
      itemId: string;
      quantity: number | string;
    }) =>
      (
        await api.post(`/shopping-lists/${payload.listId}/items`, {
          itemId: payload.itemId,
          quantity: payload.quantity,
        })
      ).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["list", selectedListId] }),
  });

  const removeLine = useMutation({
    mutationFn: async (payload: { listId: string; lineId: string }) =>
      (
        await api.delete(
          `/shopping-lists/${payload.listId}/items/${payload.lineId}`,
        )
      ).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["list", selectedListId] }),
  });

  const archiveList = useMutation({
    mutationFn: async (listId: string) =>
      (await api.post(`/shopping-lists/${listId}/archive`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists"] });
      setSelectedListId(null);
    },
  });

  // UI
  return (
    <div className="row g-4">
      <div className="col-md-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h4 className="mb-0">Lists</h4>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              const t = prompt("List title?");
              if (t) createList.mutate(t);
            }}
          >
            New
          </button>
        </div>
        <div className="list-group">
          {listsQ.data?.map((l) => (
            <button
              key={l.id}
              className={`list-group-item list-group-item-action ${l.id === selectedListId ? "active" : ""}`}
              onClick={() => setSelectedListId(l.id)}
            >
              <div className="d-flex justify-content-between">
                <span>{l.title}</span>
                <small>{l._count?.items ?? 0}</small>
              </div>
            </button>
          )) || <div className="text-muted">No lists yet.</div>}
        </div>
      </div>

      <div className="col-md-8">
        {selectedList.data ? (
          <>
            <div className="d-flex align-items-center justify-content-between">
              <h4 className="mb-3">{selectedList.data.title}</h4>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => archiveList.mutate(selectedList.data.id)}
              >
                Archive
              </button>
            </div>

            <AddLine
              items={itemsQ.data || []}
              onAdd={(itemId, qty) =>
                addLine.mutate({
                  listId: selectedList.data!.id,
                  itemId,
                  quantity: qty,
                })
              }
            />

            <ul className="list-group mt-3">
              {selectedList.data.items.map((line) => (
                <li
                  key={line.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <strong>{line.item.name}</strong>{" "}
                    <small className="text-muted">
                      x {line.quantity}
                      {line.unitOverride ?? ` ${line.item.unit}`}
                    </small>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() =>
                      removeLine.mutate({
                        listId: selectedList.data!.id,
                        lineId: line.id,
                      })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="text-muted">Select or create a list.</div>
        )}
      </div>
    </div>
  );
}

function AddLine({
  items,
  onAdd,
}: {
  items: Item[];
  onAdd: (itemId: string, qty: number) => void;
}) {
  const [itemId, setItemId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const options = useMemo(
    () => items.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })),
    [items],
  );
  return (
    <div className="d-flex gap-2">
      <select
        className="form-select"
        value={itemId}
        onChange={(e) => setItemId(e.target.value)}
      >
        <option value="">Select item...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        className="form-control"
        type="number"
        min={0.1}
        step={0.1}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
      />
      <button
        className="btn btn-primary"
        disabled={!itemId || qty <= 0}
        onClick={() => onAdd(itemId, qty)}
      >
        Add
      </button>
    </div>
  );
}
