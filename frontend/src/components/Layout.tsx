import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/meetings", label: "Meetings" },
  { to: "/whiteboards", label: "Whiteboards" },
  { to: "/team", label: "Team" },
  { to: "/integrations", label: "Integrations" },
];

export default function Layout() {
  const { username, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
        <div className="px-5 py-5">
          <h1 className="text-lg font-bold text-slate-900">Exec Assistant</h1>
          <p className="text-xs text-slate-400">Meetings, tasks & reports</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "block rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="mb-2 truncate text-sm font-medium text-slate-700">{username}</p>
          <button
            onClick={logout}
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
