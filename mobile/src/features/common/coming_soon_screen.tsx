import { Pressable, StyleSheet, Text, View } from "react-native";

interface ComingSoonScreenProps {
    ctaLabel: string;
    description: string;
    onPress(): void;
    title: string;
}

export function ComingSoonScreen({
    ctaLabel,
    description,
    onPress,
    title,
}: ComingSoonScreenProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <Pressable onPress={onPress} style={styles.button}>
                <Text style={styles.buttonLabel}>{ctaLabel}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
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
