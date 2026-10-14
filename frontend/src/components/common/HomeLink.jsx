import { Link } from 'react-router-dom';
import './HomeLink.css';

// "Go to homepage" button shown at the top-left of the Login / Signup pages
export default function HomeLink() {
  return (
    <Link to="/" className="home-link">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      <span>Go to homepage</span>
    </Link>
  );
}
