import { useEffect, useState } from "react";
import { Check, X, UserPlus, Phone, Loader2, ShieldAlert, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
  try {
    const token = sessionStorage.getItem("token");
    const response = await fetch("https://localhost:7160/api/admin/therapists/pending", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error("Failed to fetch pending requests");

    const data = await response.json();
    
    setRequests(data); 
  } catch (error) {
    console.error("Error fetching requests:", error);
    toast({ title: "Error loading requests", variant: "destructive" });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id, action) => {
    setActionLoading(id);
    const token = sessionStorage.getItem("token");
    const url = `https://localhost:7160/api/admin/therapists/${id}/${action}`;
    
    try {
      const response = await fetch(url, {
        method: action === 'approve' ? "PUT" : "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== id));
        toast({
          title: action === 'approve' ? "Approved!" : "Rejected",
          description: action === 'approve' ? "Therapist is now active." : "Request removed.",
        });
      }
    } catch (error) {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="animate-spin text-primary w-10 h-10" />
      <p className="text-muted-foreground">Filtering pending requests...</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="text-primary" /> Join Requests
          </h1>
          <p className="text-muted-foreground text-sm">Review incoming practitioner applications.</p>
        </div>
        <div className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
          <ShieldAlert size={14} /> {requests.length} Pending {requests.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-muted/30 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="px-6 py-4">Therapist</th>
                <th className="px-6 py-4">License</th>
                <th className="px-6 py-4">Bio</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence>
                {requests.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan="5" className="px-6 py-20 text-center text-muted-foreground italic">
                      All caught up! No pending therapists.
                    </td>
                  </motion.tr>
                ) : (
                  requests.map((req) => (
                    <motion.tr 
                      layout
                      key={req.id} 
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="hover:bg-muted/10 transition-colors"
                    >
                      {/* עמודה 1: שם והתמחות */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{req.fullName}</div>
                        <div className="text-xs text-primary font-medium">{req.specialties}</div>
                      </td>

                      {/* עמודה 2: רשיון (בנפרד) */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs bg-muted px-2 py-1 rounded w-fit">
                          <BadgeCheck size={12} className="text-muted-foreground" />
                          {req.licenseNumber}
                        </div>
                      </td>

                      {/* עמודה 3: ביו (בנפרד) */}
                      <td className="px-6 py-4">
                        <div className="text-xs text-muted-foreground italic max-w-[200px] line-clamp-2">
                          {req.bio || "No bio provided."}
                        </div>
                      </td>

                      {/* עמודה 4: קשר */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Phone size={12}/> {req.phone || req.phoneNumber}</span>
                        </div>
                      </td>

                      {/* עמודה 5: כפתורי פעולה */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleAction(req.id, 'approve')}
                            disabled={actionLoading === req.id}
                            className="bg-green-600 hover:bg-green-700 h-8 rounded-lg shadow-sm"
                          >
                            {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} className="mr-1" />} 
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleAction(req.id, 'reject')}
                            disabled={actionLoading === req.id}
                            className="text-destructive hover:bg-destructive/10 h-8"
                          >
                            <X size={16} />
                          </Button>
                        </div>
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

export default AdminRequests;