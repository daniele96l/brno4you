import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { ensureSampleDataSeeded } from "@/lib/partners";

/** Legacy reports URL → first project documents tab */
export default async function AdminReportsRedirect() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  await ensureSampleDataSeeded();
  const projects = await listProjects();
  if (projects[0]) {
    redirect(`/admin/projects/${projects[0].id}?tab=documents`);
  }
  redirect("/admin");
}
