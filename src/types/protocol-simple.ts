export interface ProtocolField {
  id: string;
  name: string;
  length?: number; // in bytes (optional for variable-length fields)
  isVariable?: boolean; // true if field has variable length
  valueType?: 'text' | 'hex'; // for variable fields: how to interpret the value (default: 'hex')
  valueFormat?: 'dec' | 'hex'; // for non-variable fields: display as decimal or hex (default: 'dec')
  enabled?: boolean; // whether to include this field in the assembled message (default: true)
  value: string;
  description?: string;
}

export interface Protocol {
  id: string;
  name: string;
  description?: string;
  fields: ProtocolField[];
}
