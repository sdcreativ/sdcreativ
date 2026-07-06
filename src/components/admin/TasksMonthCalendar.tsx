"use client";

import { useMemo, useState } from "react";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  getMonthGrid,
  toDateKey,
} from "@/content/calendar-labels";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  formatTaskDate,
  isTaskOverdue,
  priorityStyles,
} from "@/content/tasks-labels";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
};

export function TasksMonthCalendar({ tasks, onOpenTask }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(toDateKey(today));

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate) ?? [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    return map;
  }, [tasks]);

  const grid = getMonthGrid(year, month);
  const selectedTasks = tasksByDay.get(selectedDay) ?? [];

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const todayKey = toDateKey(today);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-light" aria-label="Mois précédent">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-bold text-foreground">
            {MONTH_LABELS[month]} {year}
          </h2>
          <button type="button" onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-light" aria-label="Mois suivant">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1 text-center text-[10px] font-semibold uppercase text-gray-text">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((date) => {
            const key = toDateKey(date);
            const dayTasks = tasksByDay.get(key) ?? [];
            const inMonth = date.getMonth() === month;
            const isSelected = key === selectedDay;
            const isToday = key === todayKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(key)}
                className={cn(
                  "min-h-[72px] rounded-xl border p-1.5 text-left transition-colors",
                  inMonth ? "border-gray/30 bg-white" : "border-transparent bg-gray-light/40 opacity-60",
                  isSelected && "border-primary ring-2 ring-primary/20",
                  isToday && !isSelected && "border-primary/40",
                )}
              >
                <span className={cn("text-xs font-semibold", isToday ? "text-primary" : "text-foreground")}>
                  {date.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 2).map((task) => (
                      <span
                        key={task.id}
                        className="block truncate rounded bg-sky-500/10 px-1 py-0.5 text-[9px] font-medium text-sky-800"
                      >
                        {task.title}
                      </span>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="block text-[9px] text-gray-text">+{dayTasks.length - 2}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-foreground">
          {formatTaskDate(selectedDay)}
        </h3>
        <p className="mt-1 text-xs text-gray-text">
          {selectedTasks.length} tâche{selectedTasks.length !== 1 ? "s" : ""} avec échéance
        </p>

        {selectedTasks.length === 0 ? (
          <p className="mt-6 text-sm text-gray-text">Aucune échéance ce jour.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {selectedTasks.map((task) => {
              const overdue = isTaskOverdue(task.dueDate, task.status);
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="w-full rounded-xl border border-gray/30 p-3 text-left hover:border-primary/30 hover:bg-primary-light/10"
                  >
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full bg-gray-light px-2 py-0.5 text-[10px] font-medium text-gray-text">
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", priorityStyles[task.priority])}>
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                      {overdue && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                          Retard
                        </span>
                      )}
                    </div>
                    {task.assignee && (
                      <p className="mt-1 text-[10px] text-gray-text">{task.assignee}</p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
