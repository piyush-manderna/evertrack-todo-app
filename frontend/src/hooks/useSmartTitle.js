import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseTaskText } from '../utils/parseTaskDate';

/*
  useSmartTitle: reads a date/time out of the task title and fills the form's date and time.

    const smart = useSmartTitle(form, setForm, { baseDate, baseTime, initialTitle });

  - baseDate / baseTime: what the fields show when the title mentions nothing
    (Add: the default day and empty time. Edit: the task's saved date and time).
  - initialTitle: the title the form started with. Nothing is read until the title is
    changed, so opening Edit never rewrites a saved date.
  - smart.markDate / smart.markTime: call these when the person edits the date or time input
    by hand. After that, the title no longer overwrites that field.
  - smart.chip: what to show in <SmartChip />
  - smart.finalTitle: the title to save (date words removed when they were used)
*/
export default function useSmartTitle(form, setForm, { baseDate, baseTime = '', initialTitle = '' }) {
  const [touched, setTouched] = useState({ date: false, time: false });

  const parsed = useMemo(
    () => (form.title !== initialTitle ? parseTaskText(form.title) : null),
    [form.title, initialTitle]
  );

  useEffect(() => {
    setForm((f) => {
      const date = touched.date ? f.task_date : (parsed?.task_date || baseDate);
      const time = touched.time ? f.task_time : (parsed?.task_time || baseTime);
      return date === f.task_date && time === f.task_time ? f : { ...f, task_date: date, task_time: time };
    });
  }, [parsed, touched, baseDate, baseTime, setForm]);

  const appliedDate = !touched.date && parsed?.task_date ? parsed.task_date : null;
  const appliedTime = !touched.time && parsed?.task_time ? parsed.task_time : null;
  const used = Boolean(appliedDate || appliedTime);

  return {
    chip: { date: appliedDate, time: appliedTime, repeat: parsed?.repeat || null, title: used ? parsed.title : null },
    finalTitle: used ? parsed.title : form.title,
    markDate: useCallback(() => setTouched((t) => ({ ...t, date: true })), []),
    markTime: useCallback(() => setTouched((t) => ({ ...t, time: true })), []),
  };
}
