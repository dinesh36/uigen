import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
  useFileSystem: vi.fn(() => ({
    getAllFiles: vi.fn(() => new Map()),
    refreshTrigger: 0,
    files: new Map(),
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div>{children}</div>,
  useChat: vi.fn(() => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    status: "idle",
  })),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview Frame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Header Actions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

function isHidden(element: HTMLElement): boolean {
  return element.className.includes("hidden");
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

test("preview frame is visible by default", () => {
  render(<MainContent />);

  const previewFrame = screen.getByTestId("preview-frame");
  const previewContainer = previewFrame.parentElement!;
  expect(isHidden(previewContainer)).toBe(false);
});

test("code editor is hidden by default", () => {
  render(<MainContent />);

  const codeEditor = screen.getByTestId("code-editor");
  // Walk up to find the ResizablePanelGroup that gets the hidden class
  const panelGroup = codeEditor.closest("[class*='h-full']") as HTMLElement;
  expect(panelGroup && isHidden(panelGroup)).toBe(true);
});

test("clicking Code tab hides preview and shows code editor", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  const previewFrame = screen.getByTestId("preview-frame");
  const previewContainer = previewFrame.parentElement!;
  expect(isHidden(previewContainer)).toBe(true);

  const codeEditor = screen.getByTestId("code-editor");
  const panelGroup = codeEditor.closest("[class*='h-full']") as HTMLElement;
  expect(panelGroup && isHidden(panelGroup)).toBe(false);
});

test("clicking Preview tab after Code tab restores preview visibility", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  await user.click(previewTab);

  const previewFrame = screen.getByTestId("preview-frame");
  const previewContainer = previewFrame.parentElement!;
  expect(isHidden(previewContainer)).toBe(false);

  const codeEditor = screen.getByTestId("code-editor");
  const panelGroup = codeEditor.closest("[class*='h-full']") as HTMLElement;
  expect(panelGroup && isHidden(panelGroup)).toBe(true);
});

test("both views remain in the DOM at all times", () => {
  render(<MainContent />);

  // Both should always be in the DOM (just hidden/shown via CSS)
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.getByTestId("file-tree")).toBeDefined();
});

test("Preview tab is active by default", () => {
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  const codeTab = screen.getByRole("tab", { name: "Code" });

  expect(previewTab.getAttribute("data-state")).toBe("active");
  expect(codeTab.getAttribute("data-state")).toBe("inactive");
});

test("Code tab becomes active after clicking it", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  expect(codeTab.getAttribute("data-state")).toBe("active");
  expect(screen.getByRole("tab", { name: "Preview" }).getAttribute("data-state")).toBe("inactive");
});

test("can toggle multiple times and views remain in DOM", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  const previewTab = screen.getByRole("tab", { name: "Preview" });

  await user.click(codeTab);
  await user.click(previewTab);
  await user.click(codeTab);
  await user.click(previewTab);

  // Both views should still be in the DOM after multiple toggles
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.getByTestId("code-editor")).toBeDefined();

  // Preview should be visible, code should be hidden
  const previewContainer = screen.getByTestId("preview-frame").parentElement!;
  expect(isHidden(previewContainer)).toBe(false);
});
