import "./CookiePolicy.css";
import { useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";

const CookiePolicy = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = "https://www.basicadv.com/cookie-policy";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-content">
        <h1>{t("legal.cookie.title")}</h1>
        <p>{t("legal.cookie.updated", { date: "5 marzo 2025" })}</p>

        <p>{t("legal.cookie.intro")}</p>

        <h2>{t("legal.cookie.what.title")}</h2>
        <p>{t("legal.cookie.what.body")}</p>

        <h2>{t("legal.cookie.types.title")}</h2>
        <p>{t("legal.cookie.types.intro")}</p>
        <ul>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.cookie.types.essential"),
              }}
            />
          </li>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.cookie.types.analytics"),
              }}
            />
          </li>
        </ul>

        <h2>{t("legal.cookie.use.title")}</h2>
        <p>{t("legal.cookie.use.intro")}</p>
        <ul>
          <li>{t("legal.cookie.use.li1")}</li>
          <li>{t("legal.cookie.use.li2")}</li>
        </ul>

        <h2>{t("legal.cookie.duration.title")}</h2>
        <p>{t("legal.cookie.duration.intro")}</p>
        <ul>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.cookie.duration.session"),
              }}
            />
          </li>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.cookie.duration.persistent"),
              }}
            />
          </li>
        </ul>

        <h2>{t("legal.cookie.manage.title")}</h2>
        <p>{t("legal.cookie.manage.intro")}</p>
        <ul>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.cookie.manage.banner"),
              }}
            />
          </li>
          <li>
            <span
              dangerouslySetInnerHTML={{
                __html: t("legal.cookie.manage.browser"),
              }}
            />
            <ul>
              <li>{t("legal.cookie.manage.chrome")}</li>
              <li>{t("legal.cookie.manage.firefox")}</li>
              <li>{t("legal.cookie.manage.safari")}</li>
            </ul>
          </li>
        </ul>

        <h2>{t("legal.cookie.third.title")}</h2>
        <p>{t("legal.cookie.third.intro")}</p>
        <ul>
          <li>
            <Trans
              i18nKey="legal.cookie.third.ga"
              components={[
                // eslint-disable-next-line react/jsx-key
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                />,
              ]}
            />
          </li>
        </ul>

        <h2>{t("legal.cookie.contact.title")}</h2>
        <p>{t("legal.cookie.contact.intro")}</p>
        <p style={{ whiteSpace: "pre-line" }}>
          <Trans i18nKey="legal.cookie.contact.block">
            <a href="mailto:info@basicadv.com">info@basicadv.com</a>
          </Trans>
        </p>

        <p>{t("legal.cookie.footer", { year: currentYear })}</p>
      </div>
    </div>
  );
};

export default CookiePolicy;
