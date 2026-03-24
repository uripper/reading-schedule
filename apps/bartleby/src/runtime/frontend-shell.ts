/**
 * Loads the shared frontend HTML shell into the Tauri web app.
 */
import frontendShellHtml from "../../../../packages/frontend/index.html?raw";

const SHELL_HEAD_NODE_ATTRIBUTE = "data-bartleby-shell-head";

function parsedFrontendShell(): Document {
    const PARSER = new DOMParser();
    return PARSER.parseFromString(frontendShellHtml, "text/html");
}

function isStylesheetLink(node: Element): boolean {
    if (node.tagName !== "LINK") {
        return false;
    }
    return node.getAttribute("href") === "styles.css";
}

function isScriptNode(node: Element): boolean {
    return node.tagName === "SCRIPT";
}

function isImportedShellNode(node: Element): boolean {
    return !(isScriptNode(node) || isStylesheetLink(node));
}

function clearImportedHeadNodes(): void {
    const SELECTOR = `[${SHELL_HEAD_NODE_ATTRIBUTE}="true"]`;
    for (const NODE of document.querySelectorAll(SELECTOR)) {
        NODE.remove();
    }
}

function appendImportedHeadNodes(shellDocument: Document): void {
    clearImportedHeadNodes();
    for (const NODE of shellDocument.head.children) {
        if (!isImportedShellNode(NODE)) {
            continue;
        }
        const CLONE = NODE.cloneNode(true);
        if (CLONE instanceof Element) {
            CLONE.setAttribute(SHELL_HEAD_NODE_ATTRIBUTE, "true");
        }
        document.head.append(CLONE);
    }
}

function applyShellDocumentAttributes(shellDocument: Document): void {
    const ROOT = document.documentElement;
    ROOT.lang = shellDocument.documentElement.lang;
    for (const Attribute of shellDocument.documentElement.attributes) {
        if (Attribute.name === "lang") {
            continue;
        }
        ROOT.setAttribute(Attribute.name, Attribute.value);
    }
}

function applyShellBody(shellDocument: Document): void {
    for (const NODE of shellDocument.querySelectorAll("script")) {
        NODE.remove();
    }
    document.body.innerHTML = shellDocument.body.innerHTML;
}

export function installFrontendShell(): void {
    const SHELL_DOCUMENT = parsedFrontendShell();
    applyShellDocumentAttributes(SHELL_DOCUMENT);
    appendImportedHeadNodes(SHELL_DOCUMENT);
    document.title = SHELL_DOCUMENT.title;
    applyShellBody(SHELL_DOCUMENT);
}
