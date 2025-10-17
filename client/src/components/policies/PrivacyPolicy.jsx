import "./PrivacyPolicy.css";
import { useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";

const PrivacyPolicy = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = "https://www.basicadv.com/privacy-policy";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-content">
        <h1>{t("legal.privacy.title")}</h1>
        <p>{t("legal.privacy.updated", { date: "5 marzo 2025" })}</p>

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
            <Trans i18nKey="legal.privacy.data.auto">
              <a href="/cookie-policy">Cookie Policy</a>
            </Trans>
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
          <li>{t("legal.privacy.rights.access")}</li>
          <li>{t("legal.privacy.rights.rect")}</li>
          <li>{t("legal.privacy.rights.erase")}</li>
          <li>{t("legal.privacy.rights.restrict")}</li>
          <li>{t("legal.privacy.rights.object")}</li>
          <li>{t("legal.privacy.rights.port")}</li>
          <li>{t("legal.privacy.rights.withdraw")}</li>
        </ul>
        <p>
          <Trans i18nKey="legal.privacy.rights.how">
            <a href="mailto:info@basicadv.com">info@basicadv.com</a>
          </Trans>
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
          <Trans i18nKey="legal.privacy.cookies.body">
            <a href="/cookie-policy">Cookie Policy</a>
          </Trans>
        </p>

        <h2>{t("legal.privacy.contact.title")}</h2>
        <p>{t("legal.privacy.contact.intro")}</p>
        <p style={{ whiteSpace: "pre-line" }}>
          <Trans i18nKey="legal.privacy.contact.block">
            <a href="mailto:info@basicadv.com">info@basicadv.com</a>
          </Trans>
        </p>

        <h2>{t("legal.privacy.complaints.title")}</h2>
        <p>{t("legal.privacy.complaints.body")}</p>

        <p>{t("legal.privacy.footer", { year: currentYear })}</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
