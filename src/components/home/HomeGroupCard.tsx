import type { HomeGroup } from '../../services/homeContentService';

type HomeGroupCardProps = {
  group: HomeGroup;
};

const HomeGroupCard = ({ group }: HomeGroupCardProps) => {
  return (
    <article className="home-group-card">
      {group.coverImageUrl ? (
        <div className="home-group-card__image" style={{ backgroundImage: `url(${group.coverImageUrl})` }} />
      ) : null}
      <div className="home-group-card__body">
        <h3>{group.name}</h3>
        <p className="home-group-card__location">
          {group.city}, {group.state}
        </p>
        <p className="home-group-card__members">{group.memberCount.toLocaleString()} members</p>
        {group.activities ? (
          <p className="home-group-card__activities">{group.activities.join(' • ')}</p>
        ) : null}
        {typeof group.distanceMiles === 'number' ? (
          <p className="home-group-card__distance">{group.distanceMiles} miles away</p>
        ) : null}
      </div>
    </article>
  );
};

export default HomeGroupCard;
