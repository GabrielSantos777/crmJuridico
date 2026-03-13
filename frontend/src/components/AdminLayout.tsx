import { NavLink } from "react-router-dom";

export default function AdminLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r bg-card p-4 hidden md:block">
        <div className="mb-6 text-lg font-semibold">Admin</div>
        <nav className="space-y-2">
          <NavLink
            to="/admin/offices"
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`
            }
          >
            Escritorios
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`
            }
          >
            Usuarios
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        {title ? <h1 className="mb-6 text-2xl font-bold">{title}</h1> : null}
        {children}
      </main>
    </div>
  );
}
