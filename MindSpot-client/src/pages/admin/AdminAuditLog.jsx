import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  AlertTriangle,
  FileText,
  RefreshCcw,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const API = "https://localhost:7160";
const PAGE_SIZE = 25;

const AdminAuditLog = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  });

  const fetchSummary = async () => {
    const res = await fetch(`${API}/api/audit/summary`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch audit summary.");
    return res.json();
  };

  const fetchLogs = async (skipValue) => {
    const res = await fetch(`${API}/api/audit?take=${PAGE_SIZE}&skip=${skipValue}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch audit log.");
    return res.json();
  };

  const loadInitial = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, logsData] = await Promise.all([fetchSummary(), fetchLogs(0)]);
      setSummary(summaryData);
      setLogs(logsData.results || []);
      setTotal(logsData.total || 0);
      setSkip((logsData.results || []).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const logsData = await fetchLogs(skip);
      setLogs((prev) => [...prev, ...(logsData.results || [])]);
      setSkip((prev) => prev + (logsData.results || []).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
        <p className="text-muted-foreground animate-pulse">{t("adminAuditLog.loading")}</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">Error: {error}</div>;
  }

  const summaryCards = [
    {
      label: t("adminAuditLog.failedOperations"),
      value: summary?.failedOperations || 0,
      icon: AlertTriangle,
      color: "text-destructive",
    },
    {
      label: t("adminAuditLog.medicalRecordViews"),
      value: summary?.medicalRecordViews || 0,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      label: t("adminAuditLog.refundsIssued"),
      value: summary?.refundsIssued || 0,
      icon: RefreshCcw,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <History className="text-primary" size={20} /> {t("adminAuditLog.title")}
          </h1>
          <p className="text-muted-foreground text-xs">{t("adminAuditLog.subtitle")}</p>
        </div>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {t("adminAuditLog.totalEntries", { count: total })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <stat.icon size={14} className={stat.color} />
            </div>
            <p className="text-xl font-black text-foreground leading-none">{stat.value}</p>
            <p className="text-[11px] font-medium text-muted-foreground leading-tight mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-muted/30 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="px-4 py-3">{t("adminAuditLog.colTime")}</th>
                <th className="px-4 py-3">{t("adminAuditLog.colAction")}</th>
                <th className="px-4 py-3">{t("adminAuditLog.colActor")}</th>
                <th className="px-4 py-3">{t("adminAuditLog.colTarget")}</th>
                <th className="px-4 py-3">{t("adminAuditLog.colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence>
                {logs.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan="5" className="px-6 py-16 text-center text-muted-foreground italic">
                      {t("adminAuditLog.empty")}
                    </td>
                  </motion.tr>
                ) : (
                  logs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-xs">{log.action}</div>
                        <div className="text-[11px] text-muted-foreground">{log.actionDescription}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">{log.actorRole}</span>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{log.actorId}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.targetType ? `${log.targetType}${log.targetId ? ` · ${log.targetId}` : ""}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {log.succeeded ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
                            <CheckCircle2 size={12} /> {log.httpStatusCode}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                            <XCircle size={12} /> {log.httpStatusCode}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {logs.length < total && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            {t("adminAuditLog.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLog;
