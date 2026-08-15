import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { ensureSampleDataSeeded } from "@/lib/partners";

/** Legacy settings URL → first project settings tab */
export default async function AdminSettingsRedirect() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  await ensureSampleDataSeeded();
  const projects = await listProjects();
  if (projects[0]) {
    redirect(`/admin/projects/${projects[0].id}?tab=settings`);
  }
  redirect("/admin");
}
