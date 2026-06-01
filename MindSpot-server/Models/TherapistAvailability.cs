namespace MindSpot_server.Models
{
    public class WeeklySlot
    {
        public int    DayOfWeek  { get; set; }  // 0=Sun … 6=Sat
        public string StartTime  { get; set; } = "09:00";  // HH:mm
        public string EndTime    { get; set; } = "17:00";
    }

    public class TherapistAvailability
    {
        public string Id          { get; set; } = "TherapistAvailability/";
        public string TherapistId { get; set; } = string.Empty;
        public List<WeeklySlot> WeeklySlots { get; set; } = new();
        public int SessionDurationMinutes   { get; set; } = 50;
        public int BreakBetweenMinutes      { get; set; } = 10;
        public DateTime UpdatedAt           { get; set; } = DateTime.UtcNow;
    }

    public class UpsertAvailabilityRequest
    {
        public string TherapistId             { get; set; } = string.Empty;
        public List<WeeklySlot> WeeklySlots   { get; set; } = new();
        public int SessionDurationMinutes     { get; set; } = 50;
        public int BreakBetweenMinutes        { get; set; } = 10;
    }
}
