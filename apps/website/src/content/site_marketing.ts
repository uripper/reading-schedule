/**
 * Marketing copy and section content for the public landing page.
 */

import type {
    FeatureItem,
    HeroContent,
    WorkflowStep,
} from "../types/site_content.ts";
import { DOWNLOAD_SECTION_URL } from "./site_urls.ts";

export const FEATURE_ITEMS: readonly FeatureItem[] = [
    {
        description:
            "Bartleby can transform your backlog from intimidating to\
            manageable.",
        title: "Tame your backlog",
    },
    {
        description:
            "Only want to read on Wednesdays? Want to read everyday but\
            only Anna Karenina on Wednesdays? Want to read Ulysses on\
            Wednesdays, but only after finishing Anna Karenina?\
            Bartleby can do all of this and more!",
        title: "Plan around your life",
    },
    {
        description:
            "Reading more can be intimidating, even if you want to do it.\
            Bartleby was designed to make it a little bit easier to stay on\
            track. Set daily goals, conquer the paralysis of choice, and focus\
            on actually reading.",
        title: "Stay motivated",
    },
    {
        description:
            "Bartleby gives statistics on how many books you're scheduled to\
            read, shows when you'll finish each book, and helps you see just\
            how much reading you'll do.",
        title: "See how much you'll read",
    },
];

export const HERO_CONTENT: HeroContent = {
    body: "Bartleby creates a daily reading schedule for you so you always know\
     what to read next",
    headlineAccent: "Books",
    headlineLead: "Read More",
    primaryAction: {
        href: DOWNLOAD_SECTION_URL,
        label: "Download",
        variant: "primary",
    },
};

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
    {
        description:
            "Add your unread books. You can add as many or as few as you\
            would like!",
        title: "Add your books",
    },
    {
        description:
            "Set your reading speed and how many minutes you want to read per\
            day to get a full schedule. Bartleby is extremely customizable\
            beyond this.",
        title: "Set your preferences",
    },
    {
        description:
            "Bartleby automatically updates its plans based on your\
            books, settings, and more. It only takes a second to\
            build a fully planned schedule for years to come.",
        title: "Bartleby plans your schedule",
    },
    {
        description:
            "When you make progress in a book, update them in Bartleby.\
            Bartleby automatically updates its schedule for you.",
        title: "Track your progress",
    },
];
