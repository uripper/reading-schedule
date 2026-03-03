import { StatusBar } from "expo-status-bar";
import { MobileApp } from "./src/app";

/**
 * The main entry point for the mobile application. 
 * It sets up the status bar and renders the MobileApp 
 * component.
 * @returns A React component that represents the mobile 
 * application.
 */
export default function App() {
    return (
        <>
            <StatusBar style="dark" />
            <MobileApp />
        </>
    );
}
