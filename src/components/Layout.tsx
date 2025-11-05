import { Link, NavLink } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import useAuth from '../hooks/useAuth';
import DeveloperModePanel from './dev/DeveloperModePanel';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? { color: '#38bdf8' } : undefined;

const Layout = ({ children }: PropsWithChildren) => {
  const { profile, logout } = useAuth();

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
            {profile && (profile.role === 'organizer' || profile.role === 'admin') ? (
              <NavLink to="/organizer" style={navLinkClass}>
                Organizer tools
              </NavLink>
            ) : null}
            {profile ? (
              <NavLink to="/billing" style={navLinkClass}>
                Billing
              </NavLink>
            ) : null}
            {profile && profile.role === 'admin' ? (
              <NavLink to="/admin" style={navLinkClass}>
                Admin
              </NavLink>
            ) : null}
          </nav>
          <div className="nav-actions">
            {profile ? (
              <>
                <NavLink to="/profile" style={navLinkClass}>
                  {profile.displayName ?? profile.contactEmail}
                </NavLink>
                <button type="button" className="ghost" onClick={() => void logout()}>
                  Sign out
                </button>
              </>
            ) : (
              <NavLink to="/login" style={navLinkClass}>
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </header>
      <main>
        <div className="container">{children}</div>
      </main>
      <footer>
        Crafted for outdoor explorers. Manage your community meetups with ease.
      </footer>
      <DeveloperModePanel />
    </div>
  );
};

export default Layout;
