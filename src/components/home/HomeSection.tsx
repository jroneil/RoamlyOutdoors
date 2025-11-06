import { ReactNode } from 'react';

type HomeSectionProps = {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

const HomeSection = ({ id, title, description, action, children }: HomeSectionProps) => {
  return (
    <section id={id} className="home-section card">
      <header className="home-section__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="home-section__action">{action}</div> : null}
      </header>
      <div className="home-section__content">{children}</div>
    </section>
  );
};

export default HomeSection;
