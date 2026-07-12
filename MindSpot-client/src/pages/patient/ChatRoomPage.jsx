// This page moved to `src/pages/ChatRoomPage.jsx` — it's now a single shared,
// role-agnostic component used by both the patient and therapist dashboards
// (the SignalR ChatHub already enforces server-side that only the
// appointment's actual patient/therapist may join the room).
// Re-exported here for backwards compatibility with any stale imports.
export { default } from "../ChatRoomPage";
