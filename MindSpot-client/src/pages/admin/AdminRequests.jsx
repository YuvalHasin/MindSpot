import {useEffect, useState} from "react";
import {Check, UserPlus, Phone, Loader2, ShieldAlert, BadgeCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
import {motion, AnimatePresence} from "framer-motion";
import {useToast} from "@/hooks/use-toast";
import {useTranslation} from "react-i18next";

const AdminRequests = () => {
  const { t } = useTranslation();
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
    toast({ title: t("adminRequests.errorLoading"), variant: "destructive" });
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
    // RavenDB IDs look like "Therapists/1-A" — extract only the numeric part for the URL
    const safeId = id.includes("/") ? id.split("/")[1] : id;
    const url = `https://localhost:7160/api/admin/therapists/${safeId}/${action}`;

    try {
      const response = await fetch(url, {
        method: action === 'approve' ? "PUT" : "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== id));
        toast({
          title: action === 'approve' ? t("adminRequests.approvedTitle") : t("adminRequests.rejectedTitle"),
          description: action === 'approve' ? t("adminRequests.approvedDesc") : t("adminRequests.rejectedDesc"),
        });
      }
    } catch (error) {
      toast({ title: t("adminRequests.actionFailed"), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="animate-spin text-primary w-10 h-10" />
      <p className="text-muted-foreground">{t("adminRequests.filteringRequests")}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="text-primary" /> {t("adminRequests.title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("adminRequests.subtitle")}</p>
        </div>
        <div className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
          <ShieldAlert size={14} /> {requests.length} {t("adminRequests.pending")} {requests.length !== 1 ? t("adminRequests.pendingPlural") : ''}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-muted/30 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="px-6 py-4">{t("adminRequests.colTherapist")}</th>
                <th className="px-6 py-4">{t("adminRequests.colLicense")}</th>
                <th className="px-6 py-4">{t("adminRequests.colBio")}</th>
                <th className="px-6 py-4">{t("adminRequests.colContact")}</th>
                <th className="px-6 py-4 text-right">{t("adminRequests.colVerification")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence>
                {requests.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan="5" className="px-6 py-20 text-center text-muted-foreground italic">
                      {t("adminRequests.noPending")}
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
                        {req.verificationFailureReason && (
                          <div className="flex items-start gap-1 mt-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 max-w-[220px]">
                            <ShieldAlert size={11} className="shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{req.verificationFailureReason}</span>
                          </div>
                        )}
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
                          {req.bio || t("adminRequests.noBio")}
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
                            {t("adminRequests.approve")}
                          </Button>
                          <Button
                            size="sm"
