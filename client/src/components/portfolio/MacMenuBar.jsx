import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

export default function MacMenuBar({ className = "" }) {
  const { i18n, t } = useTranslation(["common"]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const nbsp = "\u00A0";
  const cap = (s = "") =>
    s ? s.replace(".", "").replace(/^./, (c) => c.toUpperCase()) : s;

  const locale = i18n.language?.startsWith("it") ? "it-IT" : "en-US";
  const hour12 = !locale.startsWith("it"); // EN => 12h, IT => 24h

  const parts = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const wd = cap(get("weekday"));
  const mon = locale === "it-IT" ? get("month") : cap(get("month"));
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod"); // AM/PM (only present when hour12=true)

  const clock =
    locale === "it-IT"
      ? `${wd} ${day} ${mon}${nbsp}${nbsp}${hour}:${minute}`
      : `${wd} ${mon} ${day}${nbsp}${nbsp}${hour}:${minute}${
          dayPeriod ? ` ${dayPeriod}` : ""
        }`;

  return (
    <div className={`mac-menubar ${className}`}>
      <div className="menubar-left">
        <span className="apple" aria-hidden>
          
        </span>
        <span className="menu-item active">
          {t("portfolio.menubar.finder")}
        </span>
        <span className="menu-item">{t("portfolio.menubar.file")}</span>
        <span className="menu-item">{t("portfolio.menubar.edit")}</span>
        <span className="menu-item">{t("portfolio.menubar.view")}</span>
        <span className="menu-item">{t("portfolio.menubar.go")}</span>
        <span className="menu-item">{t("portfolio.menubar.window")}</span>
        <span className="menu-item">{t("portfolio.menubar.help")}</span>
      </div>
      <div className="menubar-right">
        <span className="status" aria-label={t("aria.clock", "Clock")}>
          {clock}
        </span>
      </div>
    </div>
  );
}

MacMenuBar.propTypes = {
  className: PropTypes.string,
};
