export type DocumentType = "id_card" | "passport";

export type IdVerificationStatus =
  | "pending"
  | "matched"
  | "mismatch_dismissed"
  | "failed";

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
  created_at: string;
  updated_at: string;
};

export type GeneratedDocument = {
  id: string;
  student_id: string;
  template_id: string;
  filename: string;
  mime: string;
  storage_path: string;
  created_at: string;
};
