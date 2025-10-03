import { useState } from "react";
import { useAuth } from "../../context/AuthProvider";
import api from "../../api/axios";

export default function ProfilePage() {
  const { user, house, refreshMe, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const createHouse = async () => {
    const name = prompt("House name?");
    if (!name) return;
    setBusy(true);
    try {
      await api.post("/houses", { name });
      await refreshMe();
      alert("House created.");
    } catch (e: any) {
      alert(e?.response?.data?.error || "create_house_failed");
    } finally {
      setBusy(false);
    }
  };

  const joinHouse = async () => {
    const houseId = prompt("Enter House ID to join:");
    if (!houseId) return;
    setBusy(true);
    try {
      await api.post("/houses/join", { houseId: houseId.trim() });
      await refreshMe();
      alert("Joined house.");
    } catch (e: any) {
      alert(e?.response?.data?.error || "join_house_failed");
    } finally {
      setBusy(false);
    }
  };

  const leaveHouse = async () => {
    if (!confirm("Leave current house?")) return;
    setBusy(true);
    try {
      // use GET because backend is GET /houses/leave
      await api.post("/houses/leave");
      await refreshMe();
      alert("Left house.");
    } catch (e: any) {
      alert(e?.response?.data?.error || "leave_house_failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-lg-6 col-md-8">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title mb-3">Profile</h4>

            {/* Name */}
            <div className="mb-3">
              <label className="form-label">Name</label>
              <div className="form-control-plaintext">{user.displayName}</div>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="form-label">Email</label>
              <div className="form-control-plaintext">{user.email}</div>
            </div>

            {/* House */}
            <div className="mb-3">
              <label className="form-label">House</label>
              <div className="form-control-plaintext">
                {house ? (
                  <>
                    <div className="mb-2">
                      Joined: <strong>{house.name}</strong>{" "}
                      <small className="text-muted">({house.id})</small>
                    </div>
                    <button
                      className="btn btn-outline-danger"
                      disabled={busy}
                      onClick={leaveHouse}
                    >
                      Leave house
                    </button>
                  </>
                ) : (
                  <div className="vstack gap-2">
                    <div className="text-muted">Not in a house.</div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={createHouse}
                      >
                        Create house
                      </button>
                      <button
                        className="btn btn-outline-primary"
                        disabled={busy}
                        onClick={joinHouse}
                      >
                        Join house
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <hr />
            <button className="btn btn-outline-secondary" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
