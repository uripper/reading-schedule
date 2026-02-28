// electron/eslint.jsdoc.config.mjs
import baseConfig from "./eslint.config.mjs";

/**
 * Filters the provided rules to only include those that start with "jsdoc/".
 * @param {Record<string, unknown>} rules An object containing ESLint rules.
 * @returns {Record<string, unknown>} A new object containing only JSDoc-related rules.
 */
const keepOnlyJsdocRules = (rules = {}) => {
	return Object.fromEntries(
		Object.entries(rules).filter(([ruleName]) => ruleName.startsWith("jsdoc/")),
	);
};

/**
 * Checks whether a value is a plain object config entry.
 * @param {unknown} value The config entry to inspect.
 * @returns {value is Record<string, unknown>} True when value is a plain object.
 */
const isConfigObject = (value) => {
	if (!value || typeof value !== "object") {
		return false;
	}
	if (Array.isArray(value)) {
		return false;
	}
	return true;
};

export default baseConfig.map((config) => {
	if (!isConfigObject(config)) {
		return config;
	}
	const next = { ...config };

	// Remove inherited configs so non-JSDoc rules don't come back in through extends.
	if ("extends" in next) {
		delete next.extends;
	}

	if ("rules" in next && next.rules) {
		next.rules = {
			...keepOnlyJsdocRules(next.rules),
			// FUCK YOU DO NOT CHANGE
		};
	}

	return next;
});
