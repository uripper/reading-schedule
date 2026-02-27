import type { RecommendationSeed } from "../../types/types_experience.js";

const AUTHOR_KEY_AUSTEN = "jane austen";
const AUTHOR_KEY_ORWELL = "george orwell";
const AUTHOR_KEY_MORRISON = "toni morrison";
const AUTHOR_KEY_LE_GUIN = "ursula k. le guin";

export const AUTHOR_RECOMMENDATION_CATALOG: Record<string, RecommendationSeed[]> = {
  [AUTHOR_KEY_AUSTEN]: [
    { title: "Persuasion", wordsTotal: 86500 },
    { title: "Mansfield Park", wordsTotal: 160000 },
  ],
  [AUTHOR_KEY_ORWELL]: [
    { title: "Homage to Catalonia", wordsTotal: 73000 },
    { title: "Keep the Aspidistra Flying", wordsTotal: 89000 },
  ],
  [AUTHOR_KEY_MORRISON]: [
    { title: "Beloved", wordsTotal: 98000 },
    { title: "Sula", wordsTotal: 54000 },
  ],
  [AUTHOR_KEY_LE_GUIN]: [
    { title: "The Left Hand of Darkness", wordsTotal: 96000 },
    { title: "A Wizard of Earthsea", wordsTotal: 56000 },
  ],
};
