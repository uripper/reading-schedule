export interface SelectOption {
  value: string;
  label: string;
}

export interface BaseFieldDefinition {
  id: string;
  label: string;
  hint?: string;
  step?: string;
}

export type SelectFieldDefinition = BaseFieldDefinition & {
  type: "select";
  options: SelectOption[];
};

export type InputFieldDefinition = BaseFieldDefinition & {
  type: "number" | "date" | "checkbox";
};

export type FieldDefinition = SelectFieldDefinition | InputFieldDefinition;

export type FieldGroupName = "window" | "budget" | "weights" | "display";
