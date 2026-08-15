import { randomId } from "./auth";
import {
  createProject,
  listProjects,
  saveProject,
} from "./projects";
import { createStudentFromForm, listStudents, saveStudent } from "./students";
import { rpc } from "./supabase";
import type { StudentFormInput } from "./student-schema";

export type Partner = {
  id: string;
  project_id: string;
  name: string;
  oid: string;
  national_id: string;
  address: string;
  legal_representative: string;
  coordinator_name: string;
  email: string;
  phone: string;
  country: string;
  created_at?: string;
  updated_at?: string;
};

export async function listPartners(
  projectId?: string | null,
): Promise<Partner[]> {
  const data = await rpc<Partner[]>("brno4you_list_partners", {
    p_project_id: projectId ?? null,
  });
  return data || [];
}

export async function savePartner(partner: Partner): Promise<Partner> {
  return rpc<Partner>("brno4you_upsert_partner", { p_partner: partner });
}

const SAMPLE_STUDENTS_YE: StudentFormInput[] = [
  {
    first_name: "Anna",
    has_second_name: false,
    second_name: "",
    surname: "Nováková",
    has_second_surname: false,
    second_surname: "",
    birth_date: "2007-03-14",
    nationality: "Czech",
    email: "anna.novakova@example.com",
    phone: "+420777100101",
    document_type: "id_card",
    document_number: "123456789",
    document_country: "Czech Republic",
  },
  {
    first_name: "Marco",
    has_second_name: true,
    second_name: "Luca",
    surname: "Rossi",
    has_second_surname: false,
    second_surname: "",
    birth_date: "2006-11-02",
    nationality: "Italian",
    email: "marco.rossi@example.com",
    phone: "+39333100200",
    document_type: "passport",
    document_number: "YA1234567",
    document_country: "Italy",
  },
];

const SAMPLE_STUDENTS_TC: StudentFormInput[] = [
  {
    first_name: "Sofia",
    has_second_name: false,
    second_name: "",
    surname: "Kowalska",
    has_second_surname: false,
    second_surname: "",
    birth_date: "1999-07-22",
    nationality: "Polish",
    email: "sofia.kowalska@example.com",
    phone: "+48500100300",
    document_type: "id_card",
    document_number: "ABC123456",
    document_country: "Poland",
  },
  {
    first_name: "Jonas",
    has_second_name: false,
    second_name: "",
    surname: "Berg",
    has_second_surname: false,
    second_surname: "",
    birth_date: "1998-01-30",
    nationality: "German",
    email: "jonas.berg@example.com",
    phone: "+49170100400",
    document_type: "passport",
    document_number: "C01X2Y3Z4",
    document_country: "Germany",
  },
];

async function seedStudents(
  projectId: string,
  samples: StudentFormInput[],
) {
  const existing = await listStudents(projectId);
  if (existing.length > 0) return;
  for (const data of samples) {
    const student = createStudentFromForm(data, projectId);
    student.id = `sample_${randomId().slice(0, 8)}`;
    student.id_verification_status = "matched";
    await saveStudent(student);
  }
}

/** Seed demo YE + TC projects, students, partners when empty. */
export async function ensureSampleDataSeeded() {
  let projects = await listProjects();

  if (!projects.some((p) => p.type === "youth_exchange")) {
    const ye = createProject({
      name: "Together for Inclusion — YE Brno 2026",
      type: "youth_exchange",
      slug: "together-inclusion-ye-2026",
      project_name: "Together for Inclusion — Youth Exchange Brno 2026",
      project_no: "2026-YE-BRNO-01",
      project_period: "1 June 2026 – 31 August 2026",
      dates: "12–21 July 2026 (including travel days)",
      venue: "Brno, Czech Republic",
      coordinator_email: "hedvika@brnoforyou.cz",
      coordinator_phone: "+420777000111",
    });
    ye.id = "proj_sample_ye";
    await saveProject(ye);
  }

  if (!projects.some((p) => p.type === "training_course")) {
    const tc = createProject({
      name: "Facilitators Lab — TC Brno 2026",
      type: "training_course",
      slug: "facilitators-lab-tc-2026",
      project_name: "Facilitators Lab — Training Course Brno 2026",
      project_no: "2026-TC-BRNO-01",
      project_period: "1 September 2026 – 30 November 2026",
      dates: "5–12 October 2026 (including travel days)",
      venue: "Brno, Czech Republic",
      coordinator_email: "hedvika@brnoforyou.cz",
      coordinator_phone: "+420777000111",
    });
    tc.id = "proj_sample_tc";
    await saveProject(tc);
  }

  projects = await listProjects();
  const ye = projects.find((p) => p.type === "youth_exchange") || projects[0];
  const tc = projects.find((p) => p.type === "training_course");

  if (ye) await seedStudents(ye.id, SAMPLE_STUDENTS_YE);
  if (tc) await seedStudents(tc.id, SAMPLE_STUDENTS_TC);

  const now = new Date().toISOString();

  if (ye && (await listPartners(ye.id)).length === 0) {
    await savePartner({
      id: "partner_youth_italy",
      project_id: ye.id,
      name: "Youth Bridge Milano",
      oid: "E10234567",
      national_id: "IT monza-123",
      address: "Via Roma 12, 20121 Milano, Italy",
      legal_representative: "Giulia Bianchi",
      coordinator_name: "Luca Ferrari",
      email: "projects@youthbridgemilano.example",
      phone: "+39021234567",
      country: "Italy",
      created_at: now,
      updated_at: now,
    });
    await savePartner({
      id: "partner_youth_poland",
      project_id: ye.id,
      name: "Fundacja Młodzi Razem",
      oid: "E10987654",
      national_id: "KRS 000123456",
      address: "ul. Krakowska 8, 30-001 Kraków, Poland",
      legal_representative: "Piotr Nowak",
      coordinator_name: "Magdalena Wiśniewska",
      email: "erasmus@mlodzirazem.example",
      phone: "+48123456789",
      country: "Poland",
      created_at: now,
      updated_at: now,
    });
  }

  if (tc && (await listPartners(tc.id)).length === 0) {
    await savePartner({
      id: "partner_tc_spain",
      project_id: tc.id,
      name: "Asociación Horizonte Joven",
      oid: "E10555666",
      national_id: "G12345678",
      address: "Calle Mayor 5, 28013 Madrid, Spain",
      legal_representative: "Carmen Ruiz",
      coordinator_name: "Diego Álvarez",
      email: "mobility@horizontejoven.example",
      phone: "+34911222333",
      country: "Spain",
      created_at: now,
      updated_at: now,
    });
  }

  return {
    projects: await listProjects(),
    students: await listStudents(),
    partners: await listPartners(),
  };
}
