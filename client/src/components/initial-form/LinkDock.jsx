import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  FaInstagram,
  FaFacebook,
  FaGlobe,
  FaLink,
  FaFolderOpen,
  FaTimes,
  FaApple,
  FaAndroid,
  FaCodeBranch,
  FaPaintBrush,
  FaLaptopCode,
} from "react-icons/fa";
import "./LinkDock.css";

/**
 * Dock chip → un'unica riga input full-width che cambia in base al chip attivo
 * active: "website" | "ig" | "fb" | "assets" | "refs" | null
 */
export default function LinkDock({
  t,
  showWebsite,
  showInstagram,
  showFacebook,
  showAssets,
  showReferences,
  showAppLinks,
  values,
  errors,
  onChange,
}) {
  const [active, setActive] = useState(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // chiudi con click fuori
  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setActive(null);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  // chiudi con ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setActive(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // mappa config chip → field/placeholder/icon
  const CHIP_CONF = useMemo(
    () => ({
      website: {
        shown: !!showWebsite,
        field: "websiteUrl",
        label: t("form.links.website"),
        placeholder: t("form.placeholders.websiteUrl"),
        icon: <FaGlobe />,
      },
      ig: {
        shown: !!showInstagram,
        field: "instagramUrl",
        label: t("form.links.instagram"),
        placeholder: t("form.placeholders.instagramUrl"),
        icon: <FaInstagram />,
      },
      fb: {
        shown: !!showFacebook,
        field: "facebookUrl",
        label: t("form.links.facebook"),
        placeholder: t("form.placeholders.facebookUrl"),
        icon: <FaFacebook />,
      },
      assets: {
        shown: !!showAssets,
        field: "assetsLink",
        label: t("form.links.assets"),
        placeholder: t("form.placeholders.assetsLink"),
        icon: <FaFolderOpen />,
      },
      refs: {
        shown: !!showReferences,
        field: "referenceUrls",
        label: t("form.links.referencesShort"),
        placeholder: t("form.placeholders.referenceOne"),
        icon: <FaLink />,
      },
      ios: {
        shown: !!showAppLinks,
        field: "iosUrl",
        label: t("form.platforms.ios"),
        placeholder: t("form.placeholders.iosUrl"),
        icon: <FaApple />,
      },
      android: {
        shown: !!showAppLinks,
        field: "androidUrl",
        label: t("form.platforms.android"),
        placeholder: t("form.placeholders.androidUrl"),
        icon: <FaAndroid />,
      },
      webapp: {
        shown: !!showAppLinks,
        field: "webappUrl",
        label: t("form.platforms.webapp"),
        placeholder: t("form.placeholders.webappUrl"),
        icon: <FaLaptopCode />,
      },
      repo: {
        shown: !!showAppLinks,
        field: "repoUrl",
        label: t("form.links.repoUrl"),
        placeholder: t("form.placeholders.repoUrl"),
        icon: <FaCodeBranch />,
      },
      design: {
        shown: !!showAppLinks,
        field: "designLink",
        label: t("form.links.designLink"),
        placeholder: t("form.placeholders.designLink"),
        icon: <FaPaintBrush />,
      },
    }),
    [
      t,
      showWebsite,
      showInstagram,
      showFacebook,
      showAssets,
      showReferences,
      showAppLinks,
    ]
  );

  const openFirstIfOnlyOne = () => {
    // opzionale: nessun chip attivo all’inizio
  };

  useEffect(() => {
    openFirstIfOnlyOne();
  }, []);

  // token per references
  const refsTokens = useMemo(() => {
    const raw = values.referenceUrls || "";
    return raw
      .split(/[,\n ]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [values.referenceUrls]);

  const addToken = (url) => {
    const clean = (url || "").trim();
    if (!clean) return;
    const set = new Set(refsTokens);
    set.add(clean);
    onChange({ name: "referenceUrls", value: Array.from(set).join(", ") });
  };

  const removeToken = (url) => {
    onChange({
      name: "referenceUrls",
      value: refsTokens.filter((x) => x !== url).join(", "),
    });
  };

  // value/placeholder correnti per la shared row
  const current = active ? CHIP_CONF[active] : null;
  const currentValue =
    current && current.field !== "referenceUrls"
      ? values[current.field] || ""
      : "";
  const currentError = current && errors ? errors[current.field] : null;

  useEffect(() => {
    if (active && inputRef.current) {
      // focus input al cambio chip
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [active]);

  return (
    <div className="ld-wrap" ref={wrapRef}>
      {/* CHIP ROW */}
      <div className="ld-chip-row" role="tablist" aria-label="Optional links">
        {Object.entries(CHIP_CONF).map(([k, cfg]) =>
          cfg.shown ? (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active === k}
              className={`ld-chip ${active === k ? "is-active" : ""} ${
                errors[CHIP_CONF[k].field] ? "has-error" : ""
              }`}
              onClick={() => setActive(active === k ? null : k)}
            >
              <span className="ld-chip-ico">{cfg.icon}</span>
              <span className="ld-chip-lab">{cfg.label}</span>
            </button>
          ) : null
        )}
      </div>

      {/* SHARED INPUT ROW (stessa larghezza di “Ambito”) */}
      <div
        className={`ld-shared ${active ? "open" : ""}`}
        aria-hidden={!active}
      >
        {/* References: token + input inline */}
        {active === "refs" ? (
          <>
            <div className="ld-refs">
              {refsTokens.map((u) => (
                <span className="ld-tag" key={u}>
                  {u}
                  <button
                    type="button"
                    className="ld-x"
                    onClick={() => removeToken(u)}
                    aria-label="Remove"
                  >
                    <FaTimes />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="url"
                inputMode="url"
                className="ld-input-shared flex"
                placeholder={CHIP_CONF.refs.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToken(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
                onBlur={(e) => {
                  addToken(e.currentTarget.value);
                  e.currentTarget.value = "";
                }}
              />
            </div>
            <small className="ld-help">{t("form.help.referenceUrls")}</small>
            {errors.referenceUrls && (
              <span className="ld-error">{errors.referenceUrls}</span>
            )}
          </>
        ) : current ? (
          <>
            <input
              ref={inputRef}
              type="url"
              inputMode="url"
              className="ld-input-shared"
              placeholder={current.placeholder}
              value={currentValue}
              onChange={(e) =>
                onChange({ name: current.field, value: e.target.value })
              }
            />
            {!!currentValue && (
              <button
                type="button"
                className="ld-clear"
                aria-label={t("form.actions.clear")}
                onClick={() => onChange({ name: current.field, value: "" })}
              >
                <FaTimes />
              </button>
            )}
            {currentError && <span className="ld-error">{currentError}</span>}
          </>
        ) : (
          // nessun chip aperto: manteniamo l’altezza per evitare salti
          <div className="ld-placeholder" />
        )}
      </div>
    </div>
  );
}

LinkDock.propTypes = {
  t: PropTypes.func.isRequired,
  showWebsite: PropTypes.bool,
  showInstagram: PropTypes.bool,
  showFacebook: PropTypes.bool,
  showAssets: PropTypes.bool,
  showReferences: PropTypes.bool,
  values: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  showAppLinks: PropTypes.bool,
};
