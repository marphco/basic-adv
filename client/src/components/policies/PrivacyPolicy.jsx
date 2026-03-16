import "./PrivacyPolicy.css";
import { useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";

const PrivacyPolicy = () => {
  const currentYear = new Date().getFullYear();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = "https://www.basicadv.com/privacy-policy";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const localizedDate =
    i18n.language === "it" ? "5 marzo 2025" : "March 5, 2025";

  return (
    <div className="policy-page">
      <div className="policy-content">
        <h1>{t("legal.privacy.title")}</h1>
        <p>{t("legal.privacy.updated", { date: localizedDate })}</p>

        <p>{t("legal.privacy.intro")}</p>

        <h2>{t("legal.privacy.data.title")}</h2>
        <p>{t("legal.privacy.data.intro")}</p>
        <ul>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.privacy.data.direct"),
              }}
            />
          </li>
          <li>
            <Trans
              i18nKey="legal.privacy.data.auto"
              components={[
                // eslint-disable-next-line react/jsx-key
                <a href="/cookie-policy" />,
              ]}
            />
          </li>
        </ul>

        <h2>{t("legal.privacy.purposes.title")}</h2>
        <p>{t("legal.privacy.purposes.intro")}</p>
        <ul>
          <li>{t("legal.privacy.purposes.li1")}</li>
          <li>{t("legal.privacy.purposes.li2")}</li>
          <li>{t("legal.privacy.purposes.li3")}</li>
        </ul>

        <h2>{t("legal.privacy.legal.title")}</h2>
        <p>{t("legal.privacy.legal.intro")}</p>
        <ul>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.privacy.legal.consent"),
              }}
            />
          </li>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.privacy.legal.contract"),
              }}
            />
          </li>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.privacy.legal.law"),
              }}
            />
          </li>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.privacy.legal.legit"),
              }}
            />
          </li>
        </ul>

        <h2>{t("legal.privacy.sharing.title")}</h2>
        <p>{t("legal.privacy.sharing.intro")}</p>
        <ul>
          <li>{t("legal.privacy.sharing.li1")}</li>
          <li>{t("legal.privacy.sharing.li2")}</li>
        </ul>

        <h2>{t("legal.privacy.transfers.title")}</h2>
        <p>{t("legal.privacy.transfers.body")}</p>

        <h2>{t("legal.privacy.rights.title")}</h2>
        <p>{t("legal.privacy.rights.intro")}</p>
        <ul>
          <li>
            <strong>{t("legal.privacy.rights.access").split(" — ")[0]}</strong>
            {" — "}
            {t("legal.privacy.rights.access").split(" — ")[1]}
          </li>
          <li>
            <strong>{t("legal.privacy.rights.rect").split(" — ")[0]}</strong>
            {" — "}
            {t("legal.privacy.rights.rect").split(" — ")[1]}
          </li>
          <li>
            <strong>{t("legal.privacy.rights.erase").split(" — ")[0]}</strong>
            {" — "}
            {t("legal.privacy.rights.erase").split(" — ")[1]}
          </li>
          <li>
            <strong>
              {t("legal.privacy.rights.restrict").split(" — ")[0]}
            </strong>
            {" — "}
            {t("legal.privacy.rights.restrict").split(" — ")[1]}
          </li>
          <li>
            <strong>{t("legal.privacy.rights.object").split(" — ")[0]}</strong>
            {" — "}
            {t("legal.privacy.rights.object").split(" — ")[1]}
          </li>
          <li>
            <strong>{t("legal.privacy.rights.port").split(" — ")[0]}</strong>
            {" — "}
            {t("legal.privacy.rights.port").split(" — ")[1]}
          </li>
          <li>
            <strong>
              {t("legal.privacy.rights.withdraw").split(" — ")[0]}
            </strong>
            {" — "}
            {t("legal.privacy.rights.withdraw").split(" — ")[1]}
          </li>
        </ul>
        <p>
          <Trans
            i18nKey="legal.privacy.rights.how"
            components={[
              // eslint-disable-next-line react/jsx-key
              <a href="mailto:info@basicadv.com" />,
            ]}
          />
        </p>

        <h2>{t("legal.privacy.retention.title")}</h2>
        <p>{t("legal.privacy.retention.intro")}</p>
        <ul>
          <li>{t("legal.privacy.retention.li1")}</li>
          <li>{t("legal.privacy.retention.li2")}</li>
        </ul>

        <h2>{t("legal.privacy.security.title")}</h2>
        <p>{t("legal.privacy.security.body")}</p>

        <h2>{t("legal.privacy.cookies.title")}</h2>
        <p>
          <Trans
            i18nKey="legal.privacy.cookies.body"
            components={[
              // eslint-disable-next-line react/jsx-key
              <a href="/cookie-policy" />,
            ]}
          />
        </p>

        <h2>{t("legal.privacy.contact.title")}</h2>
        <p>{t("legal.privacy.contact.intro")}</p>
        <p style={{ whiteSpace: "pre-line" }}>
          <Trans
            i18nKey="legal.privacy.contact.block"
            components={[
              // eslint-disable-next-line react/jsx-key
              <a href="mailto:info@basicadv.com" />,
            ]}
          />
        </p>

        <h2>{t("legal.privacy.complaints.title")}</h2>
        <p>{t("legal.privacy.complaints.body")}</p>

        <p>{t("legal.privacy.footer", { year: currentYear })}</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
