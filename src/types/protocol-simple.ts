export interface ProtocolField {
  id: string;
  name: string;
  length?: number; // in bytes (optional for variable-length fields)
  isVariable?: boolean; // true if field has variable length
  value: string;
  description?: string;
}

export interface Protocol {
  id: string;
  name: string;
  description?: string;
  fields: ProtocolField[];
}
