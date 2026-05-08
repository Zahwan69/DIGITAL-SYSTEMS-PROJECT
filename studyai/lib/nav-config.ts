import {
  BookOpen,
  Bot,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Lightbulb,
  Search,
  Upload,
  Users,
} from "lucide-react";

export type AppRole = "student" | "teacher" | "admin";

export const studentNavItems = [
  { href: "/dashboard", pathMatch: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/papers", pathMatch: "/papers", label: "My Papers", icon: BookOpen },
  { href: "/upload", pathMatch: "/upload", label: "Upload", icon: Upload },
  { href: "/papers/search", pathMatch: "/papers/search", label: "Search", icon: Search },
] as const;

export const teacherNavItems = [
  ...studentNavItems,
  { href: "/teacher/dashboard", pathMatch: "/teacher/dashboard", label: "Teacher Dashboard", icon: LayoutDashboard },
  { href: "/teacher/classes", pathMatch: "/teacher/classes", label: "Classes", icon: Users },
  { href: "/teacher/assignments", pathMatch: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/teacher/insights", pathMatch: "/teacher/insights", label: "Insights", icon: Lightbulb },
  { href: "/teacher/chat", pathMatch: "/teacher/chat", label: "AI Chat", icon: Bot },
] as const;

export const adminNavItems = [
  { href: "/admin/dashboard", pathMatch: "/admin/dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", pathMatch: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/papers", pathMatch: "/admin/papers", label: "Papers", icon: FileText },
  { href: "/admin/subjects", pathMatch: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { href: "/admin/audit", pathMatch: "/admin/audit", label: "Audit log", icon: History },
] as const;

export function navForRole(role: string | null) {
  if (role === "admin") return adminNavItems;
  if (role === "teacher") return teacherNavItems;
  return studentNavItems;
}

export function pathIsActive(pathname: string, pathMatch: string) {
  let active = pathname === pathMatch;
  if (!active && pathMatch === "/papers") {
    active = pathname.startsWith("/papers/") && !pathname.startsWith("/papers/search");
  }
  if (!active && pathMatch !== "/dashboard") {
    active = pathname.startsWith(`${pathMatch}/`);
  }
  return active;
}
