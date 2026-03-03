import BLUE_CONE from "../../../assets/background-objects/blue-cone.png";
import BLUE_CYLINDER from "../../../assets/background-objects/blue-cylinder.png";
import BLUE_SQUARE from "../../../assets/background-objects/blue-square.png";
import GREEN_CONE from "../../../assets/background-objects/green-cone.png";
import GREEN_CYLINDER from "../../../assets/background-objects/green-cylinder.png";
import GREEN_DISC from "../../../assets/background-objects/green-disc.png";
import GREEN_DONUT from "../../../assets/background-objects/green-donut.png";
import PINK_CONE from "../../../assets/background-objects/pink-cone.png";
import PINK_SQUARE from "../../../assets/background-objects/pink-square.png";
import PURPLE_BOX from "../../../assets/background-objects/purple-box.png";
import RED_TRIANGLE from "../../../assets/background-objects/red-triangle.png";
import YELLOW_BOX from "../../../assets/background-objects/yellow-box.png";
import YELLOW_C from "../../../assets/background-objects/yellow-c.png";

/**
 * Represents a background sprite used in the "Today" 
 * feature of the mobile application. Each sprite has 
 * a height, width, and a source image.
 */
export interface BackgroundSprite {
    /**
     * The height of the background sprite.
     */
    height: number;
    /**
     * The source image of the background sprite.
     */
    source: number;
    /**
     * The width of the background sprite.
     */
    width: number;
}

export const BACKGROUND_SPRITES: readonly BackgroundSprite[] = [
    {
        height: 170,
        source: BLUE_CONE,
        width: 170,
    },
    {
        height: 112,
        source: BLUE_CYLINDER,
        width: 180,
    },
    {
        height: 182,
        source: BLUE_SQUARE,
        width: 182,
    },
    {
        height: 168,
        source: GREEN_CONE,
        width: 168,
    },
    {
        height: 108,
        source: GREEN_CYLINDER,
        width: 182,
    },
    {
        height: 158,
        source: GREEN_DISC,
        width: 158,
    },
    {
        height: 168,
        source: GREEN_DONUT,
        width: 168,
    },
    {
        height: 170,
        source: PINK_CONE,
        width: 170,
    },
    {
        height: 170,
        source: PINK_SQUARE,
        width: 170,
    },
    {
        height: 152,
        source: PURPLE_BOX,
        width: 152,
    },
    {
        height: 150,
        source: RED_TRIANGLE,
        width: 176,
    },
    {
        height: 146,
        source: YELLOW_BOX,
        width: 146,
    },
    {
        height: 170,
        source: YELLOW_C,
        width: 170,
    },
];
