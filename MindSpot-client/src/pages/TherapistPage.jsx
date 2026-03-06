import TherapistSidebar from "../components/therapist/TherapistSidebar";
import StatsOverview from "../components/therapist/StatsOverview";
import ConsultationQueue from "../components/therapist/ConsultationQueue";
import ActiveSession from "../components/therapist/ActiveSession";
import RecentSessions from "../components/therapist/RecentSessions";
//import SessionChart from "../components/therapist/SessionChart";

const TherapistPage = () => (
  <div className="min-h-screen bg-background flex">
    <TherapistSidebar />

    <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Good afternoon, Dr. Chen
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            You have <span className="font-semibold text-primary">3 clients</span> waiting in queue.
          </p>
        </div>

        <StatsOverview />
        <ActiveSession />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <ConsultationQueue />
          </div>
          <div className="lg:col-span-2 space-y-5">
            {/* <SessionChart /> */}
            <RecentSessions />
          </div>
        </div>
      </div>
    </main>
  </div>
);

export default TherapistPage;
