import { useState } from 'react';

// The circle that marks a task complete when clicked
export default function CompletionCircle({ onComplete, completing }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className={`completion-circle ${hovered ? 'hovered' : ''} ${completing ? 'completing' : ''}`}
      onClick={onComplete}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Mark as complete"
      type="button"
    >
      {(hovered || completing) && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
