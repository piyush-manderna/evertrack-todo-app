import './SmartChip.css';
import { describeDate, describeTime } from '../../utils/parseTaskDate';

/* Shows what was read from the title, so nothing is filled in silently. */
export default function SmartChip({ chip }) {
  if (!chip || (!chip.date && !chip.time && !chip.repeat)) return null;

  const parts = [];
  if (chip.date) parts.push(describeDate(chip.date));
  if (chip.time) parts.push(describeTime(chip.time));

  return (
    <div className="smart-chip" role="status">
      {parts.length > 0 && <span className="smart-chip-main">📅 {parts.join(' · ')}</span>}
      {chip.title && chip.title !== '' && parts.length > 0 && (
        <span className="smart-chip-note">Saved as “{chip.title}”</span>
      )}
      {chip.repeat && (
        <span className="smart-chip-note">🔁 “{chip.repeat}” isn't supported yet, so this adds one task</span>
      )}
    </div>
  );
}
