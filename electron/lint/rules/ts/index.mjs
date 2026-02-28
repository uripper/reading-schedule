import { TS_CORE_RULES } from "./core_rules.mjs";
import { TS_NAMING_CONVENTION_RULES } from "./naming_rules.mjs";
import { TS_SAFETY_RULES } from "./safety_rules.mjs";

export const TS_OPINIONATED_RULES = {
    ...TS_CORE_RULES,
    ...TS_NAMING_CONVENTION_RULES,
    ...TS_SAFETY_RULES,
};
