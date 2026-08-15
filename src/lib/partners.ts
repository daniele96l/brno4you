import { randomId } from "../auth";
import { createStudentFromForm, listStudents, saveStudent } from "../students";
import { rpc } from "../supabase";
import type { StudentFormInput } from "../student-schema";

export type Partner = {
  id: string;
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

export async function listPartners(): Promise<Partner[]> {
  const data = await rpc<Partner[]>("brno4you_list_partners", {});
  return data || [];
}

export async function savePartner(partner: Partner): Promise<Partner> {
  return rpc<Partner>("brno4you_upsert_partner", { p_partner: partner });
}

const SAMPLE_STUDENTS: StudentFormInput[] = [
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
  {
    first_name: "Sofia",
    has_second_name: false,
    second_name: "",
    surname: "Kowalska",
    has_second_surname: false,
    second_surname: "",
    birth_date: "2008-07-22",
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
    birth_date: "2005-01-30",
    nationality: "German",
    email: "jonas.berg@example.com",
    phone: "+49170100400",
    document_type: "passport",
    document_number: "C01X2Y3Z4",
    document_country: "Germany",
  },
];

const SAMPLE_PARTNERS: Omit<Partner, "created_at" | "updated_at">[] = [
  {
    id: "partner_youth_italy",
    name: "Youth Bridge Milano",
    oid: "E10234567",
    national_id: "IT monza-123",
    address: "Via Roma 12, 20121 Milano, Italy",
    legal_representative: "Giulia Bianchi",
    coordinator_name: "Luca Ferrari",
    email: "projects@youthbridgemilano.example",
    phone: "+39021234567",
    country: "Italy",
  },
  {
    id: "partner_youth_poland",
    name: "Fundacja Młodzi Razem",
    oid: "E10987654",
    national_id: "KRS 000123456",
    address: "ul. Krakowska 8, 30-001 Kraków, Poland",
    legal_representative: "Piotr Nowak",
    coordinator_name: "Magdalena Wiśniewska",
    email: "erasmus@mlodzirazem.example",
    phone: "+48123456789",
    country: "Poland",
  },
  {
    id: "partner_youth_spain",
    name: "Asociación Horizonte Joven",
    oid: "E10555666",
    national_id: "G12345678",
    address: "Calle Mayor 5, 28013 Madrid, Spain",
    legal_representative: "Carmen Ruiz",
    coordinator_name: "Diego Álvarez",
    email: "mobility@horizontejoven.example",
    phone: "+34911222333",
    country: "Spain",
  },
];

/** Seed demo students + partners when tables are empty. */
export async function ensureSampleDataSeeded() {
  const [students, partners] = await Promise.all([
    listStudents(),
    listPartners(),
  ]);

  let seededStudents = 0;
  let seededPartners = 0;

  if (students.length === 0) {
    for (const data of SAMPLE_STUDENTS) {
      const student = createStudentFromForm(data);
      // Stable-ish demo ids for readability in reports
      student.id = `sample_${randomId().slice(0, 8)}`;
      student.id_verification_status = "matched";
      await saveStudent(student);
      seededStudents += 1;
    }
  }

  if (partners.length === 0) {
    const now = new Date().toISOString();
    for (const p of SAMPLE_PARTNERS) {
      await savePartner({ ...p, created_at: now, updated_at: now });
      seededPartners += 1;
    }
  }

  // Prefill empty project settings with a sample mobility
  const { getProjectSettings, saveProjectSettings } = await import(
    "../documents/templates"
  );
  const settings = await getProjectSettings();
  let seededSettings = false;
  if (!settings.project_name?.trim()) {
    await saveProjectSettings({
      project_name: "Together for Inclusion — Youth Exchange Brno 2026",
      accreditation_no: "2022-1-CZ01-KA150-YOU-000111402",
      project_no: "2026-YE-BRNO-01",
      project_period: "1 June 2026 – 31 August 2026",
      dates: "12–21 July 2026 (including travel days)",
      venue: "Brno, Czech Republic",
      coordinator_name: "Hedvika",
      coordinator_email: "hedvika@brnoforyou.cz",
      coordinator_phone: "+420777000111",
    });
    seededSettings = true;
  }

  const result = {
    students: await listStudents(),
    partners: await listPartners(),
  };

  // #region agent log
  fetch("http://127.0.0.1:7703/ingest/6f0aa57b-155b-4f24-93e7-8b7d5e1c75fb", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "6ae41f",
    },
    body: JSON.stringify({
      sessionId: "6ae41f",
      runId: "seed",
      hypothesisId: "A",
      location: "partners.ts:ensureSampleDataSeeded",
      message: "sample seed result",
      data: {
        beforeStudents: students.length,
        beforePartners: partners.length,
        seededStudents,
        seededPartners,
        seededSettings,
        afterStudents: result.students.length,
        afterPartners: result.partners.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return result;
}
