/**
 * Roadmap content for the public website.
 */

import type { RoadmapContent } from "../types/site-content.ts";

export const ROADMAP_CONTENT: RoadmapContent = {
    heading: "Bartleby Roadmap",
    stages: [
        {
            highlightLabel: "Here Now",
            items: [
                "Add books",
                "Create a reading schedule",
                "View your reading schedule for the day",
                "Log your reading progress",
                "View your reading history and stats",
                "A large number of customizable parameters for how the reading \
schedule is generated",
            ],
            title: "Windows Release 0.1",
        },
        {
            items: ["Feature parity with Windows release 0.1"],
            title: "Mac and Linux Release 0.1",
        },
        {
            items: [
                "Open a CSV file containing your book collection and have it \
automatically parsed and imported into Bartleby",
            ],
            title: "Import your book collection from Goodreads or a CSV file",
        },
        {
            title: "Better book discovery and recommendations",
        },
        {
            title: "Sync Bartleby across devices",
        },
        {
            items: [
                "Hopefully feature parity with desktop releases at this point.",
            ],
            title: "Android Mobile App Release 0.1",
        },
        {
            title: "iOS Mobile App Release 0.1",
        },
        {
            title: "TBA",
        },
    ],
};
