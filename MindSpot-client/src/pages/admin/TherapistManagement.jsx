import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ShieldCheck, Phone, Award } from "lucide-react";

const TherapistManagement = () => {
  const [therapists, setTherapists] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTherapists = async () => {
    try {
      const token = sessionStorage.getItem("token"); 
      const response = await fetch("https://localhost:7160/api/admin/therapists", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // סינון: מציגים רק מטפלים מאושרים (isActive: true)
        const activeOnly = data.filter(t => t.isActive);
        setTherapists(activeOnly);
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

  const filteredTherapists = therapists.filter(t => 
    t.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.specialties?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="animate-spin text-primary w-10 h-10" />
      <p className="text-muted-foreground animate-pulse">Loading active practitioners...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Active Staff</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Managing {therapists.length} verified practitioners in the system.
          </p>
        </div>
        <div className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
          <ShieldCheck size={14} /> Verified Team
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or specialty..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">Therapist</th>
                <th className="px-6 py-4">License</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Bio</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {filteredTherapists.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground italic">
                      No active therapists found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredTherapists.map((therapist) => (
                    <motion.tr 
                      key={therapist.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* שם והתמחות */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{therapist.fullName}</div>
                        <div className="text-[11px] text-primary font-semibold flex items-center gap-1">
                          <Award size={12} /> {therapist.specialties}
                        </div>
                      </td>

                      {/* רשיון */}
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {therapist.licenseNumber}
                      </td>

                      {/* פרטי קשר (כולל נייד) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <span className="flex items-center gap-1.5 text-foreground font-medium">
                            <Phone size={12} className="text-muted-foreground" /> {therapist.phone || therapist.phoneNumber || "No Phone"}
                          </span>
                        </div>
                      </td>

                      {/* ביו */}
                      <td className="px-6 py-4">
                        <div className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                          {therapist.bio}
                        </div>
                      </td>

                      {/* סטטוס סופי */}
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-tighter">
                          <ShieldCheck size={12} /> Verified
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TherapistManagement;