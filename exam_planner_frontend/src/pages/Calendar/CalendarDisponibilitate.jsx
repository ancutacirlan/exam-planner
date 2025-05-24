import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarDisponibilitate.css';

const CalendarDisponibilitate = ({ examRange, onDateSelect, examDates = [] }) => {
  const minDate = new Date(examRange.period_start);
  const maxDate = new Date(examRange.period_end);

  const handleDateChange = (date) => {
    onDateSelect(date);
  };

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const tileClassName = ({ date }) => {
    for (const exam of examDates) {
      const examDate = new Date(exam.exam_date);
      if (isSameDay(date, examDate)) {
        const status = exam.status?.toUpperCase().trim();
        if (status === 'RESPINS') return 'rejected-day';
        if (status === 'PENDING') return 'pending-day';
        if (status === 'ACCEPTAT') return 'accepted-day';
      }
    }
    return null;
  };

  return (
    <div className="calendar-wrapper">
      <h3 className="calendar-title">Selectează o dată pentru examen</h3>
      <Calendar
        onChange={handleDateChange}
        minDate={minDate}
        maxDate={maxDate}
        tileClassName={tileClassName}
      />
    </div>
  );
};

export default CalendarDisponibilitate;
