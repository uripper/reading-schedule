import { StatusBar } from "expo-status-bar";
import { MobileApp } from "./src/app";

export default function App() {
    return (
        <>
            <StatusBar
                backgroundColor="#9CD2EE"
                style="dark"
                translucent={false}
            />
            <MobileApp />
        </>
    );
}
