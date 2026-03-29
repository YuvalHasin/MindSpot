import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Trash2, UserCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const TherapistManagement = () => {
  const [therapists, setTherapists] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. פונקציה למשיכת המטפלים מהשרת
  const fetchTherapists = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("https://localhost:7160/api/admin/therapists", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTherapists(data);
      }
    } catch (error) {
      console.error("Error fetching therapists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTherapists();
  }, []);

  // 2. פונקציה למחיקת מטפל
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this therapist?")) return;

    try {
      const token = localStorage.getItem("adminToken");
      // שימי לב: id של רייבן מכיל "/", אז צריך לעשות לו Encoding או לוודא שהשרת מקבל אותו נכון
      const encodedId = encodeURIComponent(id); 
      const response = await fetch(`https://localhost:7160/api/admin/therapists/${encodedId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        // רענון הרשימה לאחר מחיקה
        setTherapists(therapists.filter(t => t.id !== id));
      }
    } catch (error) {
      alert("Error deleting therapist");
    }
  };

  const filteredTherapists = therapists.filter(t => 
    t.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.specialties?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading therapists...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Therapist Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage {therapists.length} practitioners in the system.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">Therapist</th>
                <th className="px-6 py-4">License</th>
                <th className="px-6 py-4">Specialties</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTherapists.map((therapist) => (
                <tr key={therapist.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{therapist.fullName}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{therapist.bio}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{therapist.licenseNumber}</td>
                  <td className="px-6 py-4 text-muted-foreground">{therapist.specialties}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(therapist.id)}
                      className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TherapistManagement;