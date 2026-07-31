/**
 * Marketing copy and section content for the public landing page.
 */

import type {
    FeatureItem,
    HeroContent,
    WorkflowStep,
} from "../types/site-content.ts";
import { DOWNLOAD_SECTION_URL } from "./site-urls.ts";

export const FEATURE_ITEMS: readonly FeatureItem[] = [
    {
        description:
            "Do you have 10 To-Be-Read books? A hundred? A thousand?\
                        Bartleby will help you get through them all. Maybe.",
        title: "Move your books off your TBR list",
    },
    {
        description:
            "Read only on Wednesdays? Read only Rebecca on Wednesdays? Read\
            Ulysses on Wednesdays, but only after White Noise? Bartleby can do that!",
        title: "Plan around your life",
    },
    {
        description:
            "Bartleby was designed to make reading\
            a bit easier and help you achieve your reading goals.",
        title: "Get motivated. Stay motivated.",
    },
    {
        description:
            "Get stats on when you'll finish each book, and visualize all the\
            reading you'll do.",
        title: "See how much you'll read",
    },
];

export const HERO_CONTENT: HeroContent = {
    body: "Always know what to read next",
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
            day.",
        title: "Set your preferences",
    },
    {
        description:
            "Bartleby updates your reading plan based on your preferences.\
            It only takes a second to build a years-long schedule.",
        title: "Bartleby plans your schedule",
    },
    {
        description:
            "Update your reading progress in Bartleby.\
            Bartleby updates your schedule.",
        title: "Track your progress",
    },
];
