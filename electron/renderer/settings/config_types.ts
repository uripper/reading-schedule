export type SelectOption = {
  value: string;
  label: string;
};

export type BaseFieldDefinition = {
  id: string;
  label: string;
  hint?: string;
  step?: string;
};

export type SelectFieldDefinition = BaseFieldDefinition & {
  type: "select";
  options: SelectOption[];
};

export type InputFieldDefinition = BaseFieldDefinition & {
  type: "number" | "date";
};

export type FieldDefinition = SelectFieldDefinition | InputFieldDefinition;

export type FieldGroupName = "window" | "budget" | "weights";
