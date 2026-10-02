import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Bell, 
  Globe,
  Palette,
  Trash2
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  isWithinInterval
} from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { calendarEventService } from "@/api/services/calendar_event.service";
import { usePermissionContext } from "@/context/PermissionContext";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Slate", value: "#64748b" },
];

type ViewMode = "month" | "week" | "day";

const Calendar = () => {
  const { user } = usePermissionContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  // Modal Form State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notifValue, setNotifValue] = useState("30");
  const [notifUnit, setNotifUnit] = useState("minutes");
  const [eventColor, setEventColor] = useState("#3b82f6");
  const [isPublic, setIsPublic] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const data = await calendarEventService.getEvents();
      setEvents(data || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  // Month View Helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });

  // Week View Helpers
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Day View Helpers
  const dayHours = eachHourOfInterval({
    start: startOfDay(currentDate),
    end: endOfDay(currentDate),
  });

  const handleNavigate = (direction: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1));
    }
  };

  const handleDateClick = (date: Date) => {
    resetForm();
    setStartDate(format(date, "yyyy-MM-dd'T'HH:mm"));
    setIsModalOpen(true);
  };
  
  const handleEventClick = (e: React.MouseEvent, event: any) => {
    e.stopPropagation();
    setSelectedEventId(event._id);
    setEventTitle(event.title);
    setDescription(event.description || "");
    setStartDate(format(new Date(event.start), "yyyy-MM-dd'T'HH:mm"));
    if (event.end) setEndDate(format(new Date(event.end), "yyyy-MM-dd'T'HH:mm"));
    setEventColor(event.color || "#3b82f6");
    setIsPublic(event.isPublic || false);
    if (event.notification) {
      const parts = event.notification.split(" ");
      if (parts.length === 2) {
        setNotifValue(parts[0]);
        setNotifUnit(parts[1]);
      }
    }
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setSelectedEventId(null);
    setEventTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setNotifValue("30");
    setNotifUnit("minutes");
    setEventColor("#3b82f6");
    setIsPublic(false);
  };

  const saveEvent = async () => {
    if (!eventTitle || !startDate) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }
    const payload = {
      title: eventTitle,
      description,
      start: startDate,
      end: endDate || startDate,
      color: eventColor,
      isPublic,
      notification: `${notifValue} ${notifUnit}`
    };

    try {
      if (selectedEventId) {
        await calendarEventService.updateEvent(selectedEventId, payload);
        toast({ title: "Success", description: "Event updated" });
      } else {
        await calendarEventService.createEvent(payload);
        toast({ title: "Success", description: "Event created" });
      }
      setIsModalOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save event", variant: "destructive" });
    }
  };
  
  const deleteEvent = async () => {
    if (!selectedEventId) return;
    try {
      await calendarEventService.deleteEvent(selectedEventId);
      toast({ title: "Success", description: "Event deleted" });
      setIsModalOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete event", variant: "destructive" });
    }
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(e => e.start && isSameDay(new Date(e.start), date));
  };

  const getEventsForHour = (date: Date, hour: number) => {
    return events.filter(e => {
      if (!e.start) return false;
      const start = new Date(e.start);
      return isSameDay(start, date) && start.getHours() === hour;
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground text-sm font-medium">Plan and manage your schedule</p>
          </div>
        </div>

        <Card className="border-gray-400 dark:border-gray-700 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-accent/5 border-b border-gray-400 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="rounded-lg font-bold border-gray-400 dark:border-gray-700">
                  Today
                </Button>
                <div className="flex items-center gap-1 ml-2">
                  <Button variant="ghost" size="icon" onClick={() => handleNavigate("prev")} className="h-8 w-8 rounded-full">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleNavigate("next")} className="h-8 w-8 rounded-full">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {viewMode === "day" ? format(currentDate, "MMMM d, yyyy") : format(currentDate, "MMMM yyyy")}
              </h2>
              <div className="flex items-center gap-2 bg-accent/20 p-1 rounded-lg border border-gray-400 dark:border-gray-700">
                {(["month", "week", "day"] as ViewMode[]).map(mode => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className={cn("h-7 text-xs font-bold rounded-md capitalize", viewMode !== mode && "text-muted-foreground")}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* --- MONTH VIEW --- */}
            {viewMode === "month" && (
              <>
                <div className="grid grid-cols-7 border-b border-gray-400 dark:border-gray-700 bg-accent/10">
                  {DAYS.map(day => (
                    <div key={day} className="p-3 text-center text-[11px] font-black uppercase tracking-[0.2em] text-gray-700 dark:text-gray-300 border-r border-gray-400 dark:border-gray-700 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map((day, i) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    return (
                      <div
                        key={i}
                        onClick={() => handleDateClick(day)}
                        className={cn(
                          "min-h-[140px] border-b border-r border-gray-400 dark:border-gray-700 p-2 transition-all duration-200 cursor-pointer last:border-r-0",
                          !isCurrentMonth ? "bg-accent/5 opacity-40" : "bg-background hover:bg-accent/10"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={cn(
                            "text-sm font-bold flex items-center justify-center w-8 h-8 rounded-full",
                            isToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-muted-foreground"
                          )}>
                            {format(day, "d")}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map(event => (
                            <div key={event._id} onClick={(e) => handleEventClick(e, event)} className="text-[10px] px-2 py-1 rounded-lg border font-bold text-white truncate shadow-sm hover:opacity-80" style={{ backgroundColor: event.color, borderColor: `${event.color}aa` }}>
                              {event.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* --- WEEK VIEW --- */}
            {viewMode === "week" && (
              <>
                <div className="grid grid-cols-8 border-b border-gray-400 dark:border-gray-700 bg-accent/10">
                  <div className="p-3 border-r border-gray-400 dark:border-gray-700" />
                  {weekDays.map(day => (
                    <div key={day.toString()} className="p-3 text-center border-r border-gray-400 dark:border-gray-700 last:border-r-0">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{format(day, "EEE")}</div>
                      <div className={cn("text-sm font-bold", isSameDay(day, new Date()) && "text-primary")}>{format(day, "d")}</div>
                    </div>
                  ))}
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b border-gray-400 dark:border-gray-700 last:border-b-0 min-h-[60px]">
                      <div className="p-2 text-[10px] font-bold text-muted-foreground border-r border-gray-400 dark:border-gray-700 text-right pr-4 bg-accent/5">
                        {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                      </div>
                      {weekDays.map(day => {
                        const hourlyEvents = getEventsForHour(day, hour);
                        return (
                          <div key={day.toString()} onClick={() => handleDateClick(day)} className="p-1 border-r border-gray-400 dark:border-gray-700 last:border-r-0 hover:bg-accent/5 cursor-pointer">
                            {hourlyEvents.map(event => (
                              <div key={event._id} onClick={(e) => handleEventClick(e, event)} className="text-[9px] px-1.5 py-0.5 rounded border font-bold text-white truncate mb-0.5 hover:opacity-80" style={{ backgroundColor: event.color }}>
                                {event.title}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* --- DAY VIEW --- */}
            {viewMode === "day" && (
              <div className="max-h-[700px] overflow-y-auto">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const hourlyEvents = getEventsForHour(currentDate, hour);
                  return (
                    <div key={hour} className="flex border-b border-gray-400 dark:border-gray-700 last:border-b-0 min-h-[80px]">
                      <div className="w-24 p-4 text-xs font-bold text-muted-foreground border-r border-gray-400 dark:border-gray-700 text-right bg-accent/5">
                        {hour === 0 ? "12:00 AM" : hour < 12 ? `${hour}:00 AM` : hour === 12 ? "12:00 PM" : `${hour - 12}:00 PM`}
                      </div>
                      <div onClick={() => handleDateClick(currentDate)} className="flex-1 p-2 hover:bg-accent/5 cursor-pointer space-y-2">
                        {hourlyEvents.map(event => (
                          <div key={event._id} onClick={(e) => handleEventClick(e, event)} className="p-3 rounded-xl border-l-4 shadow-sm text-sm hover:bg-accent/10" style={{ backgroundColor: `${event.color}15`, borderLeftColor: event.color }}>
                             <div className="font-bold flex items-center gap-2" style={{ color: event.color }}>
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: event.color }} />
                               {event.title}
                             </div>
                             <p className="text-xs text-muted-foreground mt-1 ml-4">{event.description || "No description provided"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md rounded-3xl p-0 border-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="bg-primary p-6 text-primary-foreground shrink-0">
              <div className="flex justify-between items-center gap-4">
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 truncate">
                    <CalendarIcon className="h-5 w-5 shrink-0" />
                    {selectedEventId ? "Edit Event" : "Add New Event"}
                  </DialogTitle>
                  <p className="text-primary-foreground/70 text-xs font-medium mt-1 truncate">{selectedEventId ? "Update your schedule entry" : "Create a new entry in your schedule"}</p>
                </div>
                {selectedEventId && (
                  <Button variant="ghost" size="icon" onClick={deleteEvent} className="shrink-0 text-white hover:text-red-300 hover:bg-red-500/20 rounded-full h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </DialogHeader>
            <div className="p-6 space-y-6 bg-background overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Title *</Label><Input placeholder="What is happening?" className="rounded-xl border-border/50 h-12" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}/></div>
              <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label><Textarea placeholder="Optional details..." className="rounded-xl border-border/50 min-h-[100px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)}/></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" /> Start Date *</Label><Input type="datetime-local" className="rounded-xl border-border/50 h-11 text-xs cursor-pointer" value={startDate} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => (e.target as any).showPicker?.()}/></div>
                <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" /> End Date</Label><Input type="datetime-local" className="rounded-xl border-border/50 h-11 text-xs cursor-pointer" value={endDate} onChange={(e) => setEndDate(e.target.value)} onClick={(e) => (e.target as any).showPicker?.()}/></div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Bell className="h-3 w-3" /> Notification</Label>
                <div className="flex gap-2"><Input type="number" className="w-24 rounded-xl border-border/50 h-11" value={notifValue} onChange={(e) => setNotifValue(e.target.value)}/><Select value={notifUnit} onValueChange={setNotifUnit}><SelectTrigger className="flex-1 rounded-xl border-border/50 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minutes">Minutes</SelectItem><SelectItem value="hours">Hours</SelectItem><SelectItem value="days">Days</SelectItem><SelectItem value="weeks">Weeks</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Palette className="h-3 w-3" /> Event Color</Label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map(c => (
                    <button key={c.value} onClick={() => setEventColor(c.value)} className={cn("w-9 h-9 rounded-full transition-all border-2 flex items-center justify-center", eventColor === c.value ? "border-primary scale-110 shadow-lg" : "border-transparent")} style={{ backgroundColor: c.value }}>
                      {eventColor === c.value && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 p-5 rounded-2xl bg-accent/5 border border-border/40">
                <Checkbox id="public" checked={isPublic} onCheckedChange={(val) => setIsPublic(val as boolean)} className="rounded-md h-5 w-5 data-[state=checked]:bg-primary"/><div className="flex flex-col gap-0.5"><Label htmlFor="public" className="text-sm font-bold cursor-pointer">Public Event</Label><p className="text-[10px] text-muted-foreground">Visible to everyone in the system</p></div><Globe className="ml-auto h-5 w-5 text-primary opacity-30" />
              </div>
            </div>
            <DialogFooter className="p-6 bg-accent/5 border-t border-border/40 gap-3 shrink-0"><Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl flex-1 h-12 font-bold">Close</Button><Button onClick={saveEvent} className="rounded-xl flex-1 h-12 font-bold shadow-xl shadow-primary/20">{selectedEventId ? "Save Changes" : "Save Event"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
