import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // זה ימנע את שגיאת ה-ReferenceError

  // 1. שליפת נתונים מהשרת
  const fetchPatients = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token"); 
      const response = await fetch("https://localhost:7160/api/admin/patients", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch patients");
      
      const data = await response.json();
      setPatients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // 2. פונקציית מחיקה
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this patient?")) return;

    setActionLoading(id);
    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(`https://localhost:7160/api/admin/delete-patient/${id}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setPatients(patients.filter(p => p.id !== id));
      } else {
        alert("Failed to delete patient");
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-primary w-10 h-10" />
      <p className="text-muted-foreground">Loading patients...</p>
    </div>
  );
  
  if (error) return (
    <div className="p-8 text-center text-red-500">
      <AlertCircle className="mx-auto mb-2" /> Error: {error}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Patient Management</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage {patients.length} registered patients.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
         <table className="w-full text-sm text-left">
  <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border">
    <tr>
      <th className="px-6 py-4">Patient</th>
      <th className="px-6 py-4">Contact Info</th>
      <th className="px-6 py-4 text-right">Actions</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-border">
    <AnimatePresence>
      {filtered.map((p) => (
        <motion.tr 
          layout
          key={p.id} 
          className="hover:bg-muted/20 transition-colors"
        >
          {/* עמודת פרופיל */}
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {p.fullName ? p.fullName[0] : "P"}
              </div>
              <div>
                <div className="font-semibold text-foreground">{p.fullName}</div>
              </div>
            </div>
          </td>

          {/* עמודת קשר */}
          <td className="px-6 py-4">
            <div className="text-foreground">{p.email}</div>
          </td>

          {/* עמודת פעולות */}
          <td className="px-6 py-4 text-right">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(p.id)}
              disabled={actionLoading === p.id}
              className="text-destructive hover:bg-destructive/10"
            >
              {actionLoading === p.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 size={18} />
              )}
            </Button>
          </td>
        </motion.tr>
      ))}
    </AnimatePresence>
  </tbody>
</table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground font-medium">
              No patients found.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PatientManagement;