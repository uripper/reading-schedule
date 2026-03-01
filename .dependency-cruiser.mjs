export default {
    forbidden: [
        {
            from: {},
            name: "no-circular",
            severity: "error",
            to: { circular: true },
        },
        {
            comment: "Preload is a boundary layer, not UI implementation code.",
            from: { path: "^electron/preload\\.ts$" },
            name: "preload-not-to-renderer-impl",
            severity: "error",
            to: {
                dependencyTypesNot: ["type-only"],
                path: "^electron/renderer/",
            },
        },
        {
            from: {
                orphan: true,
                pathNot: [
                    "^electron/main\\.ts$",
                    "^electron/preload\\.ts$",
                    "^electron/renderer/app\\.ts$",
                    "^electron/tests/",
                    "^electron/scripts/",
                    "^electron/types/",
                    "\\.d\\.ts$",
                ],
            },
            name: "no-orphans",
            severity: "warn",
            to: {},
        },
    ],
    options: {
        doNotFollow: {
            dependencyTypes: ["npm", "npm-dev", "npm-peer", "npm-optional"],
        },
        exclude: [
            "^electron/dist/",
            "^electron/node_modules/",
            "^electron/tokens/dist/",
        ],
        includeOnly: "^electron/",
        reporterOptions: {
            archi: {
                collapsePattern:
                    "^(electron/(main|renderer|types|scripts|tests)(/[^/]+)?)",
            },
            dot: {
                collapsePattern: "^node_modules/(@[^/]+/[^/]+|[^/]+)",
            },
        },
        tsPreCompilationDeps: true,
    },
};
