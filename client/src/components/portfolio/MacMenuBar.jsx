import { useEffect, useState } from "react";
import "./MacMenuBar.css";

function formatClock(date = new Date()) {
  // Esempio: "mer 08 ott 21:45"
  const opts = { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" };
  return new Intl.DateTimeFormat("it-IT", opts).format(date)
    .replace(/\./g, ""); // niente puntini dopo abbreviazioni
}

export default function MacMenuBar() {
  const [now, setNow] = useState(formatClock());

  useEffect(() => {
    const id = setInterval(() => setNow(formatClock()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mac-menubar" role="navigation" aria-label="macOS menu bar">
      <div className="mac-left">
        <div className="mac-apple" aria-label="Apple menu" title="Apple">
          {/* Apple logo (SVG, così non dipende dai font) */}
          <svg viewBox="0 0 14 17" width="14" height="17" aria-hidden="true">
            <path fill="currentColor" d="M12.9 13.1c-.3.7-.7 1.3-1.1 1.8-.5.6-1 .9-1.6.9-.4 0-.9-.1-1.4-.4-.5-.3-1-.4-1.4-.4-.5 0-1 .1-1.5.4-.5.3-.9.4-1.3.4-.6 0-1.1-.3-1.6-.9-.5-.5-.9-1.1-1.2-1.8C.4 11.9 0 10.7 0 9.6c0-1 .2-1.8.7-2.5C1.1 6.4 1.7 6 2.5 6c.5 0 1.1.1 1.7.4.5.2.9.4 1.3.4.3 0 .7-.1 1.2-.3.7-.3 1.3-.4 1.8-.4.9 0 1.6.4 2.1 1.1-.8.5-1.2 1.2-1.2 2 0 .8.3 1.5.9 2 .3.3.7.5 1.1.7-.1.4-.3.8-.5 1.1zM9.9 0c0 .7-.3 1.4-.8 2-.6.7-1.3 1.1-2.2 1.1-.1-.6.1-1.3.7-2 .3-.4.7-.7 1.1-.9.4-.2.8-.3 1.2-.3.1.1.1.1 0 .1z"/>
          </svg>
        </div>
        <nav className="mac-menu">
          <span className="mac-item mac-item--active">Finder</span>
          <span className="mac-item">File</span>
          <span className="mac-item">Edit</span>
          <span className="mac-item">View</span>
          <span className="mac-item">Go</span>
          <span className="mac-item">Window</span>
          <span className="mac-item">Help</span>
        </nav>
      </div>

      <div className="mac-right">
        {/* puoi aggiungere icone wifi/batteria se vuoi */}
        <span className="mac-clock" aria-live="polite">{now}</span>
      </div>
    </div>
  );
}
