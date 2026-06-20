import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const colorMap = {
    Confirmed:            "bg-green-50 text-green-700 border-green-100",
    Pending:              "bg-yellow-50 text-yellow-700 border-yellow-100",
    Completed:            "bg-blue-50 text-blue-700 border-blue-100",
    CancelledByPatient:   "bg-red-50 text-red-600 border-red-100",
    CancelledByTherapist: "bg-red-50 text-red-600 border-red-100",
    NoShow:               "bg-gray-100 text-gray-500 border-gray-200",
  };
  const color = colorMap[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${color}`}>
      {status}
    </span>
  );
}

const TherapistPatients = () => {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const therapistId = sessionStorage.getItem("therapistId") || sessionStorage.getItem("userId");
        const token = sessionStorage.getItem("token");
        if (!therapistId || !token) { setLoading(false); return; }

        const cleanId = therapistId.includes("/") ? therapistId.split("/")[1] : therapistId;
        const res = await fetch(
          `https://localhost:7160/api/billing/appointments/therapist?therapistId=${cleanId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to load appointments.");
        const data = await res.json();
        setAppointments(data);
      } catch (err) {
        console.error("Failed to load patients", err);
        setError("Could not load patient appointments.");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        to="/therapist"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} /> {t("therapistPatients.backToDashboard")}
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="text-primary" size={22} /> {t("therapistPatients.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("therapistPatients.subtitle")}</p>
      </motion.div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {appointments.length === 0 && !error ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/40">
          <Users size={40} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground">{t("therapistPatients.noAppointments")}</h3>
          <p className="text-sm text-muted-foreground">{t("therapistPatients.noAppointmentsDesc")}</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="px-6 py-4 font-semibold">{t("therapistPatients.colPatient")}</th>
                  <th className="px-6 py-4 font-semibold">{t("therapistPatients.colDate")}</th>
                  <th className="px-6 py-4 font-semibold">{t("therapistPatients.colDuration")}</th>
                  <th className="px-6 py-4 font-semibold">{t("therapistPatients.colStatus")}</th>
                  <th className="px-6 py-4 font-semibold">{t("therapistPatients.colAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border/40 last:border-none hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      {a.patientName || a.patientId || "Patient"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(a.appointmentAt)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{a.durationMinutes} min</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">₪{a.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-border/40">
            {appointments.map((a) => (
              <div key={a.id} className="px-4 py-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {a.patientName || a.patientId || "Patient"}
                  </p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(a.appointmentAt)} · {a.durationMinutes} min · ₪{a.amount}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TherapistPatients;
