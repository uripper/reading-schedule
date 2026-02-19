import { NavLink, Outlet } from "react-router-dom";

const routes = [
  { to: "/today", label: "Today" },
  { to: "/sessions", label: "Sessions" },
  { to: "/settings", label: "Settings" },
  { to: "/books", label: "Books" },
  { to: "/schedule", label: "Schedule" },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 style={{ margin: 0 }}>Reading Schedule</h1>
      </header>
      <nav className="app-nav" aria-label="Main navigation">
        {routes.map((route) => (
          <NavLink
            key={route.to}
            to={route.to}
            style={({ isActive }) => {
              const linkStyle: { background: string; borderColor: string } = {
                background: "transparent",
                borderColor: "#32435d",
              };
              if (isActive) {
                linkStyle.background = "rgba(63, 158, 244, 0.15)";
                linkStyle.borderColor = "#3f9ef4";
              }
              return linkStyle;
            }}
          >
            {route.label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
