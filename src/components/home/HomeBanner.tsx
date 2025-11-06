import type { HomeBannerContent } from '../../services/homeContentService';

type HomeBannerProps = {
  banner: HomeBannerContent;
};

const HomeBanner = ({ banner }: HomeBannerProps) => {
  const { title, subtitle, ctaLabel, ctaHref, secondaryCtaLabel, secondaryCtaHref, stats, imageUrl } = banner;

  return (
    <section className="home-banner card" style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : undefined }}>
      <div className="home-banner__overlay" />
      <div className="home-banner__content">
        <div className="home-banner__text">
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <div className="home-banner__actions">
            <a className="home-banner__primary" href={ctaHref}>
              {ctaLabel}
            </a>
            {secondaryCtaLabel && secondaryCtaHref ? (
              <a className="home-banner__secondary" href={secondaryCtaHref}>
                {secondaryCtaLabel}
              </a>
            ) : null}
          </div>
        </div>
        <ul className="home-banner__stats">
          {stats.map((stat) => (
            <li key={stat.label}>
              <span className="home-banner__stat-value">{stat.value}</span>
              <span className="home-banner__stat-label">{stat.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default HomeBanner;
