import { Pressable, StyleSheet, Text, View } from "react-native";

interface ComingSoonScreenProps {
    ctaLabel: string;
    description: string;
    onPress(): void;
    title: string;
}

/**
 * A reusable screen component that displays a "coming soon" message.
 * @param props - An object containing the properties for the screen
 * @param ctaLabel - The label for the call-to-action button
 * @param description - A description of the upcoming feature or content
 * @param onPress - A function to be called when the call-to-action button is pressed
 * @param title - The title of the screen
 * @returns A React component that represents the "coming soon" screen, with a title, 
 * description, and a call-to-action button.
 */
export function ComingSoonScreen({
    ctaLabel,
    description,
    onPress,
    title,
}: ComingSoonScreenProps) {
    return (
        <View style={STYLES.container}>
            <Text style={STYLES.title}>{title}</Text>
            <Text style={STYLES.description}>{description}</Text>
            <Pressable onPress={onPress} style={STYLES.button}>
                <Text style={STYLES.buttonLabel}>{ctaLabel}</Text>
            </Pressable>
        </View>
    );
}

const STYLES = StyleSheet.create({
    button: {
        backgroundColor: "#F3D731",
        borderColor: "#0D0D0D",
        borderRadius: 100,
        borderWidth: 3,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    buttonLabel: {
        color: "#131313",
        fontSize: 18,
        fontWeight: "700",
    },
    container: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        rowGap: 14,
    },
    description: {
        color: "#131313",
        fontSize: 16,
        maxWidth: 320,
        textAlign: "center",
    },
    title: {
        color: "#131313",
        fontSize: 28,
        fontWeight: "800",
        textAlign: "center",
    },
});
