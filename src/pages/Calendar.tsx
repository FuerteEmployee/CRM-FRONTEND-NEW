import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { calendarEvents } from "@/data/mockData";

type ViewMode = "month" | "week" | "day";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 7)); // March 7, 2026
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(2026, 2, 7);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    // Fill remaining cells
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [firstDay, daysInMonth]);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarEvents.filter(e => e.date === dateStr);
  };

  const navigate = (dir: number) => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month + dir, 1));
    } else if (viewMode === "week") {
      setCurrentDate(new Date(currentDate.getTime() + dir * 7 * 86400000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + dir * 86400000));
    }
  };

  const goToday = () => setCurrentDate(new Date(2026, 2, 7));

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  // Week view helpers
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your schedule and events</p>
        </div>

        <Card>
          <CardContent className="p-4">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex rounded-md border overflow-hidden">
                  <Button variant="ghost" size="icon" className="rounded-none h-9 w-9" onClick={() => navigate(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-none h-9 w-9" onClick={() => navigate(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex rounded-md border overflow-hidden">
                  <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" className="rounded-none text-xs h-9" onClick={goToday}>
                    Today
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-none text-xs h-9 border-l">
                    Expand
                  </Button>
                </div>
              </div>

              <h2 className="text-xl font-semibold">{monthName}</h2>

              <div className="flex rounded-md border overflow-hidden">
                {(["month", "week", "day"] as ViewMode[]).map(v => (
                  <Button
                    key={v}
                    variant={viewMode === v ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none text-xs h-9 capitalize"
                    onClick={() => setViewMode(v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>

            {/* Month View */}
            {viewMode === "month" && (
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-7">
                  {DAYS.map(d => (
                    <div key={d} className="border-b border-r last:border-r-0 p-2 text-center text-sm font-medium bg-muted/30">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, i) => {
                    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                    const events = day ? getEventsForDay(day) : [];
                    const isCurrentMonth = day !== null;

                    return (
                      <div
                        key={i}
                        className={`border-b border-r last:border-r-0 min-h-[100px] p-1.5 ${!isCurrentMonth ? "bg-muted/10" : "bg-background"}`}
                      >
                        {day && (
                          <>
                            <div className={`text-sm mb-1 ${isToday ? "flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold" : "text-right text-muted-foreground"}`}>
                              {day}
                            </div>
                            <div className="space-y-0.5">
                              {events.map(ev => (
                                <div
                                  key={ev.id}
                                  className="text-[10px] px-1 py-0.5 rounded truncate text-white"
                                  style={{ backgroundColor: ev.color }}
                                >
                                  {ev.time !== "00:00" && <span className="font-medium">{ev.time} </span>}
                                  {ev.title}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Week View */}
            {viewMode === "week" && (
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-7">
                  {getWeekDays().map((d, i) => {
                    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
                    return (
                      <div key={i} className="border-b border-r last:border-r-0 p-2 text-center bg-muted/30">
                        <div className="text-xs text-muted-foreground">{DAYS[i]}</div>
                        <div className={`text-sm font-medium ${isToday ? "flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground mx-auto" : ""}`}>
                          {d.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-7">
                  {getWeekDays().map((d, i) => {
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    const events = calendarEvents.filter(e => e.date === dateStr);
                    return (
                      <div key={i} className="border-r last:border-r-0 min-h-[300px] p-1.5">
                        {events.map(ev => (
                          <div key={ev.id} className="text-xs px-1.5 py-1 rounded mb-1 text-white" style={{ backgroundColor: ev.color }}>
                            <div className="font-medium">{ev.time}</div>
                            <div className="truncate">{ev.title}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Day View */}
            {viewMode === "day" && (
              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-muted/30 border-b text-center">
                  <div className="text-sm text-muted-foreground">{DAYS[currentDate.getDay()]}</div>
                  <div className="text-2xl font-bold">{currentDate.getDate()}</div>
                </div>
                <div className="divide-y">
                  {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
                    const hourStr = String(hour).padStart(2, "0") + ":00";
                    const events = calendarEvents.filter(e => e.date === dateStr && e.time === hourStr);
                    return (
                      <div key={hour} className="flex min-h-[60px]">
                        <div className="w-20 p-2 text-xs text-muted-foreground border-r flex-shrink-0">
                          {hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? "12:00 PM" : `${hour}:00 AM`}
                        </div>
                        <div className="flex-1 p-1.5">
                          {events.map(ev => (
                            <div key={ev.id} className="text-xs px-2 py-1.5 rounded text-white" style={{ backgroundColor: ev.color }}>
                              <span className="font-medium">{ev.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
