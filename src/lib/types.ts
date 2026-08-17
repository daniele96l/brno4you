export type DocumentType = "id_card" | "passport";

export type IdVerificationStatus =
  | "pending"
  | "matched"
  | "mismatch_dismissed"
  | "failed";

export type ParticipationStatus = "registered" | "approved" | "rejected";

export type TravelPlanStatus = "none" | "requested" | "submitted";

export type TravelPlanFile = {
  path: string;
  filename: string;
  contentType: string;
};

export type FieldMismatch = {
  field: string;
  formValue: string;
  idValue: string;
};

export type ExtractedIdData = {
  first_name?: string | null;
  second_name?: string | null;
  surname?: string | null;
  second_surname?: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  document_country?: string | null;
  document_number?: string | null;
  document_type?: string | null;
  confidence?: number | null;
};

export type Student = {
  id: string;
  project_id: string;
  needs_travel_declaration: boolean;
  first_name: string;
  has_second_name: boolean;
  second_name: string | null;
  surname: string;
  has_second_surname: boolean;
  second_surname: string | null;
  birth_date: string;
  nationality: string;
  email: string;
  phone: string;
  document_type: DocumentType;
  document_number: string;
  document_country: string;
  id_front_path: string | null;
  id_back_path: string | null;
  id_front_hash: string | null;
  id_back_hash: string | null;
  id_verification_status: IdVerificationStatus;
  id_extracted: ExtractedIdData | null;
  id_mismatches: FieldMismatch[] | null;
  id_verified_at: string | null;
  guardian_id_front_path: string | null;
  guardian_id_back_path: string | null;
  participation_status: ParticipationStatus;
  access_token: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  custom_answers: Record<string, string | boolean>;
  requested_template_ids: string[];
  docs_requested_at: string | null;
  travel_plan_status: TravelPlanStatus;
  travel_plan_text: string | null;
  travel_plan_files: TravelPlanFile[];
  travel_plan_requested_at: string | null;
  travel_plan_submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GeneratedDocument = {
  id: string;
  student_id: string | null;
  template_id: string;
  filename: string;
  mime: string;
  storage_path: string;
  created_at: string;
  status: "generated" | "signed";
  signed_at: string | null;
  signer_name: string | null;
  signature_path: string | null;
  signed_storage_path: string | null;
};
