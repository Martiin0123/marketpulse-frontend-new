'use client';

import { useState } from 'react';
import SignalCalendar from './SignalCalendar';

export default function SignalCalendarWrapper() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  return (
    <SignalCalendar
      month={currentMonth}
      onMonthChange={setCurrentMonth}
    />
  );
}
