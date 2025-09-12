import React, { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";

// Helper functions (it's best to move these to a separate utils file)
const getCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = [];
  for (let i = 0; i < firstDay; i++) daysArray.push(null); // Padding days are null
  for (let i = 1; i <= daysInMonth; i++) daysArray.push(new Date(year, month, i));
  return daysArray;
};
const formatDateKey = (date) => {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();

const CalendarCard = ({ currentMonth, setCurrentMonth, selectedDate, setSelectedDate, docsByDate }) => {
  const calendarDays = useMemo(() => getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth()), [currentMonth]);
  
  const goToPreviousMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <div className="lg:col-span-2 bg-white/90 backdrop-blur rounded-2xl shadow-md border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">My Calendar</h2>
        <div className="flex items-center gap-1">
          <button onClick={goToPreviousMonth} className="p-1.5 rounded-full hover:bg-gray-100 transition"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
          <span className="text-sm font-medium text-gray-700 w-28 text-center">{currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}</span>
          <button onClick={goToNextMonth} className="p-1.5 rounded-full hover:bg-gray-100 transition"><ChevronRightIcon className="h-5 w-5 text-gray-600" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b pb-2 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          // ✅ FIX: Handle the case where 'day' is null
          if (!day) {
            return <div key={index} />; // Render an empty div for padding days
          }

          const dateKey = formatDateKey(day);
          const isSelected = isSameDay(day, selectedDate);
          const hasDocs = !!docsByDate[dateKey];
          
          return (
            <div key={index} onClick={() => setSelectedDate(day)}
              className={`relative p-1 text-center text-xs h-16 flex flex-col items-center justify-start rounded-lg cursor-pointer transition-all ${day.getMonth() !== currentMonth.getMonth() ? "text-gray-300" : "text-gray-700"} ${isSelected ? "bg-blue-100 ring-2 ring-blue-400" : "hover:bg-gray-50"}`}>
              <span className={`h-6 w-6 flex items-center justify-center rounded-full transition ${isSelected ? "bg-blue-600 text-white font-bold" : ""}`}>
                {day.getDate()}
              </span>
              {hasDocs && <div className="flex gap-1 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarCard;