import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
} from 'lucide-react';

interface TransactionDatePickerProps {
  dateStr: string; // 'YYYY-MM-DD'
  timeStr: string; // 'HH:MM'
  onChangeDate: (dateStr: string) => void;
  onChangeTime: (timeStr: string) => void;
}

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const pad = (n: number) => String(n).padStart(2, '0');

const toDateStr = (year: number, monthIndex: number, day: number) => {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
};

export const TransactionDatePicker: React.FC<TransactionDatePickerProps> = ({
  dateStr,
  timeStr,
  onChangeDate,
  onChangeTime,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Parse current selected date
  const parsedDate = useMemo(() => {
    if (!dateStr) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
      };
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    return {
      year: y || new Date().getFullYear(),
      month: (m ? m - 1 : 0),
      day: d || 1,
    };
  }, [dateStr]);

  // Calendar browsing state (month & year viewed)
  const [viewYear, setViewYear] = useState<number>(() => parsedDate.year);
  const [viewMonth, setViewMonth] = useState<number>(() => parsedDate.month);

  // Sync viewed month/year when calendar is opened or date changes
  const handleToggleCalendar = () => {
    if (!isCalendarOpen) {
      setViewYear(parsedDate.year);
      setViewMonth(parsedDate.month);
    }
    setIsCalendarOpen(!isCalendarOpen);
  };

  // Indonesian date text preview
  const formattedPreview = useMemo(() => {
    const d = new Date(parsedDate.year, parsedDate.month, parsedDate.day);
    const dayName = INDONESIAN_DAYS[d.getDay()];
    const monthName = INDONESIAN_MONTHS[parsedDate.month];
    return `${dayName}, ${pad(parsedDate.day)} ${monthName} ${parsedDate.year}`;
  }, [parsedDate]);

  // Relative status tag
  const relativeBadge = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = `${twoDaysAgo.getFullYear()}-${pad(twoDaysAgo.getMonth() + 1)}-${pad(twoDaysAgo.getDate())}`;

    if (dateStr === todayStr) {
      return { label: 'Hari Ini', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold' };
    }
    if (dateStr === yesterdayStr) {
      return { label: 'Kemarin', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold' };
    }
    if (dateStr === twoDaysAgoStr) {
      return { label: '2 Hari Lalu', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 font-bold' };
    }

    const sel = new Date(parsedDate.year, parsedDate.month, parsedDate.day).getTime();
    const tod = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (sel > tod) {
      return { label: 'Mendatang', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400' };
    }
    return { label: 'Lampau', color: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' };
  }, [dateStr, parsedDate]);

  // Calendar cells generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    // We align starting Monday (1) or Sunday (0) - Let's use Monday start (Indonesian standard)
    // Sunday is index 0 -> we can convert so Mon=0, Tue=1, ..., Sun=6
    const offset = (firstDayIndex + 6) % 7;

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateString: string;
    }> = [];

    // Previous month filling
    for (let i = offset - 1; i >= 0; i--) {
      const prevDay = totalDaysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: prevDay,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
        dateString: toDateStr(prevYear, prevMonth, prevDay),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        day: i,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        dateString: toDateStr(viewYear, viewMonth, i),
      });
    }

    // Next month filling to make full 35 or 42 grid
    const remaining = 42 - days.length;
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        days.push({
          day: i,
          month: nextMonth,
          year: nextYear,
          isCurrentMonth: false,
          dateString: toDateStr(nextYear, nextMonth, i),
        });
      }
    } else {
      const target35 = 35 - days.length;
      for (let i = 1; i <= target35; i++) {
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        days.push({
          day: i,
          month: nextMonth,
          year: nextYear,
          isCurrentMonth: false,
          dateString: toDateStr(nextYear, nextMonth, i),
        });
      }
    }

    return days;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSetToday = () => {
    const now = new Date();
    const str = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    onChangeDate(str);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const handleSetQuickOffsetDays = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() - daysOffset);
    const str = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
    onChangeDate(str);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  const handleSetStartOfMonth = () => {
    const now = new Date();
    const str = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    onChangeDate(str);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    onChangeTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 overflow-hidden transition-all shadow-xs">
      {/* 1. Header Bar: Selected Date Display & Menu Trigger */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                Menu Tanggal & Waktu Transaksi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] ${relativeBadge.color}`}>
              {relativeBadge.label}
            </span>
            <button
              type="button"
              onClick={handleToggleCalendar}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600/80 transition cursor-pointer shadow-2xs"
            >
              <span>{isCalendarOpen ? 'Tutup Kalender' : 'Buka Kalender'}</span>
              {isCalendarOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Selected Date Summary Card */}
        <div
          onClick={handleToggleCalendar}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-emerald-500/50 transition group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
              {pad(parsedDate.day)}
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {formattedPreview}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="font-mono font-medium">{timeStr || '12:00'} WIB</span>
                </span>
                <span>•</span>
                <span className="text-[10px] text-slate-400">Klik untuk ubah di kalender</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
        </div>

        {/* Quick Date Presets Row */}
        <div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                dateStr === todayStr
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickOffsetDays(1)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickOffsetDays(2)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
            >
              2 Hari Lalu
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickOffsetDays(3)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
            >
              3 Hari Lalu
            </button>
            <button
              type="button"
              onClick={handleSetStartOfMonth}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
            >
              Awal Bulan
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Calendar Menu Popover / Expander */}
      {isCalendarOpen && (
        <div className="p-3.5 bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-700/80 animate-fade-in space-y-3">
          {/* Calendar Header Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {INDONESIAN_MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => 2022 + i).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Header (Sen, Sel, Rab, Kam, Jum, Sab, Min) */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayLabel, idx) => (
              <div
                key={dayLabel}
                className={`text-[10px] font-bold uppercase py-1 ${
                  idx === 6 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {dayLabel}
              </div>
            ))}
          </div>

          {/* Calendar Dates Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item) => {
              const isSelected = item.dateString === dateStr;
              const isToday = item.dateString === todayStr;

              return (
                <button
                  key={item.dateString}
                  type="button"
                  onClick={() => {
                    onChangeDate(item.dateString);
                  }}
                  className={`relative h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-extrabold shadow-sm scale-105 z-10'
                      : isToday
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30'
                      : item.isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>{item.day}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-emerald-500 absolute bottom-1" />
                  )}
                  {isSelected && (
                    <Check className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-white/90" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Manual Input Fallbacks / Direct Edit */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Input Tanggal Manual / Sistem:
              </label>
              <button
                type="button"
                onClick={handleSetToday}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Kembali ke Hari Ini
              </button>
            </div>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => {
                if (e.target.value) {
                  onChangeDate(e.target.value);
                  const [y, m] = e.target.value.split('-').map(Number);
                  if (y) setViewYear(y);
                  if (m) setViewMonth(m - 1);
                }
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* 3. Time Picker Section */}
      <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Waktu Transaksi</span>
          </label>
          <button
            type="button"
            onClick={handleSetCurrentTime}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Jam Sekarang</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Time Input */}
          <div className="col-span-1">
            <input
              type="time"
              value={timeStr}
              onChange={(e) => onChangeTime(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Quick Time Presets */}
          <div className="col-span-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
            {[
              { label: '08:00', time: '08:00' },
              { label: '12:00', time: '12:00' },
              { label: '17:00', time: '17:00' },
              { label: '20:00', time: '20:00' },
            ].map((preset) => (
              <button
                key={preset.time}
                type="button"
                onClick={() => onChangeTime(preset.time)}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                  timeStr === preset.time
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
