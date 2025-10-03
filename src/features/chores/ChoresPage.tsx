import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import api from "../../api/axios";

type Member = { id: string; displayName: string; email: string };
type Chore = {
  id: string;
  title: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  assignedToId: string | null;
  assignedTo?: { id: string; displayName: string } | null;
  isArchived: boolean;
  updatedAt: string;
};

export default function ChoresPage() {
  const qc = useQueryClient();

  // filters + create form state
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newFreq, setNewFreq] = useState<"DAILY" | "WEEKLY" | "MONTHLY">(
    "WEEKLY",
  );
  const [newAssignee, setNewAssignee] = useState<string>("");

  // house members (assignee options)
  const membersQ = useQuery({
    queryKey: ["house-members"],
    queryFn: async () => (await api.get<Member[]>("/houses/members")).data,
  });
  const members = membersQ.data || [];

  // chores list
  const choresQ = useQuery({
    queryKey: ["chores", { showArchived, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showArchived) params.set("archived", "true");
      const { data } = await api.get<Chore[]>(
        "/chores" + (params.size ? `?${params}` : ""),
      );
      const arr = Array.isArray(data) ? data : [];
      // client-side search by title
      return arr.filter((c) =>
        c.title.toLowerCase().includes(search.trim().toLowerCase()),
      );
    },
  });

  const chores = useMemo(
    () => (choresQ.data || []).slice().sort(sortChores),
    [choresQ.data],
  );

  // create chore
  const createMut = useMutation({
    mutationFn: async (p: {
      title: string;
      frequency: "DAILY" | "WEEKLY" | "MONTHLY";
      assignedToId: string | null;
    }) => (await api.post("/chores", p)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });

  // complete chore -> persist by archiving in backend
  const completeMut = useMutation({
    mutationFn: async (id: string) => {
      // your backend should set isArchived=true here
      return (await api.post(`/chores/${id}/archive`)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chores"] });
    },
    onError: () => alert("complete_chore_failed"),
  });

  // reassign chore (optimistic id swap; name refreshed on settle)
  const assignMut = useMutation({
    mutationFn: async (p: { id: string; assignedToId: string | null }) =>
      (
        await api.patch(`/chores/${p.id}/reassign`, {
          assignedToId: p.assignedToId,
        })
      ).data,
    onMutate: async ({ id, assignedToId }) => {
      await qc.cancelQueries({ queryKey: ["chores"] });
      const prev = qc.getQueryData<Chore[]>([
        "chores",
        { showArchived, search },
      ]);
      if (prev) {
        const next = prev.map((c) =>
          c.id === id ? { ...c, assignedToId } : c,
        );
        qc.setQueryData(["chores", { showArchived, search }], next);
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(["chores", { showArchived, search }], ctx.prev);
      alert("assign_failed");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });

  return (
    <div className="vstack gap-3">
      <h4>Chores</h4>

      {/* Filters */}
      <div className="row g-2 align-items-end">
        <div className="col-md-6">
          <label className="form-label">Search</label>
          <input
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title…"
          />
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

      {/* Create */}
      <div className="card">
        <div className="card-body">
          <h6 className="card-title mb-3">Create chore</h6>
          <div className="row g-2">
            <div className="col-md-5">
              <input
                className="form-control"
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={newFreq}
                onChange={(e) => setNewFreq(e.target.value as any)}
              >
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-1 d-grid">
              <button
                className="btn btn-primary"
                disabled={!newTitle.trim() || createMut.isPending}
                onClick={async () => {
                  try {
                    await createMut.mutateAsync({
                      title: newTitle.trim(),
                      frequency: newFreq,
                      assignedToId: newAssignee || null,
                    });
                    setNewTitle("");
                    setNewAssignee("");
                    setNewFreq("WEEKLY");
                  } catch (e: any) {
                    alert(e?.response?.data?.error || "create_chore_failed");
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Title</th>
              <th>Frequency</th>
              <th>Assignee</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {chores.map((c) => (
              <tr key={c.id} className={c.isArchived ? "table-secondary" : ""}>
                <td>{c.title}</td>
                <td>
                  <span className="badge bg-light text-dark">
                    {c.frequency}
                  </span>
                </td>
                <td style={{ minWidth: 260 }}>
                  <AssignSelect
                    value={c.assignedToId}
                    members={members}
                    onChange={(val) =>
                      assignMut.mutate({ id: c.id, assignedToId: val })
                    }
                  />
                </td>
                <td className="text-end">
                  <div className="btn-group">
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => completeMut.mutate(c.id)}
                      title="Mark complete (archives it)"
                      disabled={completeMut.isPending || c.isArchived}
                    >
                      {c.isArchived ? "Archived" : "✓ Complete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {chores.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="text-muted">No chores.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssignSelect({
  value,
  members,
  onChange,
}: {
  value: string | null;
  members: Member[];
  onChange: (assignedToId: string | null) => void;
}) {
  return (
    <div className="d-flex gap-2">
      <select
        className="form-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

function sortChores(a: Chore, b: Chore) {
  // push archived to bottom, then newest updated first
  if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}
