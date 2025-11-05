import { Link, NavLink } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? { color: '#38bdf8' } : undefined;

const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div>
      <header className="layout-header">
        <div className="container">
          <Link to="/" className="logo">
            <img src="/logo.svg" alt="Roamly Outdoors" />
            Roamly Outdoors
          </Link>
          <nav className="nav-links">
            <NavLink to="/" style={navLinkClass} end>
              Explore
            </NavLink>
            <a href="#create">Create event</a>
            <a
              href="https://firebase.google.com/docs/firestore"
              target="_blank"
              rel="noreferrer"
            >
              Firestore guide
            </a>
          </nav>
        </div>
      </header>
      <main>
        <div className="container">{children}</div>
      </main>
      <footer>
        Crafted for outdoor explorers. Manage your community meetups with ease.
      </footer>
    </div>
  );
};

export default Layout;
