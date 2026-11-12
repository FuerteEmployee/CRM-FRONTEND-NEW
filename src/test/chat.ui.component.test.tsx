// Chat module — UI COMPONENT tests (30-master 4.1 "UI components", 24-chat.md sections 3–5).
// Renders the real pages/Chat.tsx and context/NotificationContext.tsx with mocked services,
// socket.io-client, emoji picker and Jitsi. No network, no live servers.
// Each test states the CORRECT behaviour; a failing test = a bug.
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act, within } from "@testing-library/react";
import { format } from "date-fns";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => {
  const sockets: any[] = [];
  const state = {
    user: { _id: "me", firstname: "Mona", lastname: "Admin", email: "mona@a.test" } as any,
  };
  const makeSocket = () => {
    const handlers: Record<string, ((...a: any[]) => void)[]> = {};
    const s = {
      handlers,
      emitted: [] as any[],
      on: (ev: string, fn: any) => { (handlers[ev] ||= []).push(fn); return s; },
      off: () => s,
      emit: (...a: any[]) => { s.emitted.push(a); return s; },
      disconnect: () => {},
      fire: (ev: string, ...a: any[]) => (handlers[ev] || []).forEach((fn) => fn(...a)),
    };
    sockets.push(s);
    return s;
  };
  const chatService = {
    getContacts: vi.fn(),
    getHistory: vi.fn(),
    sendMessage: vi.fn(),
    deleteMessage: vi.fn(),
    markAsRead: vi.fn(),
    createGroup: vi.fn(),
    addGroupMember: vi.fn(),
    exitGroup: vi.fn(),
    deleteGroup: vi.fn(),
  };
  const setChatUnreadCount = vi.fn();
  return { sockets, state, makeSocket, chatService, setChatUnreadCount };
});

vi.mock("socket.io-client", () => ({ io: () => h.makeSocket(), default: () => h.makeSocket() }));
vi.mock("@/api/services/chat.service", () => ({ chatService: h.chatService }));
vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/context/PermissionContext", () => ({
  usePermissionContext: () => ({ user: h.state.user, isStaff: false, can: () => false }),
}));
vi.mock("@/context/NotificationContext", async (orig) => {
  const actual: any = await orig();
  return { ...actual, useNotificationContext: () => ({ setChatUnreadCount: h.setChatUnreadCount, chatUnreadCount: 0 }) };
});
vi.mock("emoji-picker-react", () => ({
  default: ({ onEmojiClick }: any) => <button data-testid="emoji-😀" onClick={() => onEmojiClick({ emoji: "😀" })}>😀</button>,
}));
vi.mock("@jitsi/react-sdk", () => ({ JitsiMeeting: ({ roomName }: any) => <div data-testid="jitsi">{roomName}</div> }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { info: vi.fn(), error: vi.fn(), success: vi.fn() }) }));
vi.mock("@/lib/soundUtils", () => ({ playNotificationSound: vi.fn() }));
vi.mock("@/api/services/meeting.service", () => ({ meetingService: { getMeetings: vi.fn(async () => []) } }));
vi.mock("@/api/services/quotation.service", () => ({ quotationService: { getPendingApprovals: vi.fn(async () => []) } }));
vi.mock("@/api/services/purchaseOrder.service", () => ({ purchaseOrderService: { pendingApprovals: vi.fn(async () => []) } }));

import Chat from "@/pages/Chat";

const T1 = "2026-11-12T09:05:00.000Z";
const T2 = "2026-11-12T09:07:00.000Z";
const contacts = () => [
  { _id: "u1", firstname: "Ravi", lastname: "Shah", email: "ravi@a.test", admin: false, unreadCount: 2, lastMessage: "See you", lastMessageTime: T2 },
  { _id: "u2", firstname: "Priya", lastname: "Patel", email: "priya@a.test", admin: false, unreadCount: 0, lastMessage: null, lastMessageTime: null },
  { _id: "g1", isGroup: true, firstname: "Sales Team", lastname: "", email: "Group", admin: false, groupAdmin: "me", participants: ["me", "u1", "u2"], unreadCount: 1, lastMessage: "Target hit", lastMessageTime: T1 },
  { _id: "g2", isGroup: true, firstname: "Ops Team", lastname: "", email: "Group", admin: false, groupAdmin: "u1", participants: ["me", "u1"], unreadCount: 0, lastMessage: null, lastMessageTime: null },
];
const history = () => [
  { _id: "m1", message: "Hi Mona", createdAt: T1, read: true, sender: { _id: "u1", firstname: "Ravi", lastname: "Shah" } },
  { _id: "m2", message: "Hello Ravi", createdAt: T2, read: true, sender: { _id: "me", firstname: "Mona", lastname: "Admin" } },
  { _id: "m3", message: "Unread reply", createdAt: T2, read: false, sender: { _id: "me", firstname: "Mona", lastname: "Admin" } },
];

const chatSocket = () => h.sockets[h.sockets.length - 1];
const input = () => screen.getByPlaceholderText("Type a message...") as HTMLInputElement;

async function renderChat() {
  const utils = render(<Chat />);
  await screen.findByText("Ravi Shah");
  return utils;
}
async function openContact(name: string) {
  fireEvent.click(screen.getByText(name));
  await waitFor(() => expect(h.chatService.getHistory).toHaveBeenCalled());
  await screen.findByPlaceholderText("Type a message...");
}

beforeEach(() => {
  h.sockets.length = 0;
  h.state.user = { _id: "me", firstname: "Mona", lastname: "Admin", email: "mona@a.test" };
  Object.values(h.chatService).forEach((f) => f.mockReset());
  h.setChatUnreadCount.mockReset();
  h.chatService.getContacts.mockResolvedValue(contacts());
  h.chatService.getHistory.mockResolvedValue(history());
  h.chatService.sendMessage.mockImplementation(async (_to: string, message: string) => ({ _id: `new-${message}`, message, createdAt: T2, read: false }));
  h.chatService.markAsRead.mockResolvedValue({ success: true });
  h.chatService.deleteMessage.mockResolvedValue({});
  h.chatService.createGroup.mockResolvedValue({ _id: "g9" });
  h.chatService.deleteGroup.mockResolvedValue({});
  h.chatService.exitGroup.mockResolvedValue({});
  sessionStorage.clear();
});
afterEach(() => cleanup());

describe("Contacts list", () => {
  it("shows a loading skeleton, then contacts with last message, time and unread badge", async () => {
    const { container } = render(<Chat />);
    expect(container.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
    await screen.findByText("Ravi Shah");
    expect(screen.getByText("See you")).toBeInTheDocument();
    expect(screen.getByText(format(new Date(T2), "HH:mm"))).toBeInTheDocument();
    const raviRow = screen.getByText("Ravi Shah").closest("button")!;
    expect(within(raviRow).getByText("2")).toBeInTheDocument();
    // contact with no last message shows the email, not "null"
    expect(screen.getByText("priya@a.test")).toBeInTheDocument();
  });

  it("never prints undefined / null / NaN on screen", async () => {
    const { container } = await renderChat();
    expect(container.textContent).not.toMatch(/\bundefined\b|\bnull\b|\bNaN\b/);
  });

  it("search filters by first name, last name and group title (case-insensitive)", async () => {
    await renderChat();
    const search = screen.getByPlaceholderText("Search contacts...");
    fireEvent.change(search, { target: { value: "patel" } });
    expect(screen.getByText("Priya Patel")).toBeInTheDocument();
    expect(screen.queryByText("Ravi Shah")).toBeNull();
    fireEvent.change(search, { target: { value: "sales" } });
    expect(screen.getByText("Sales Team")).toBeInTheDocument();
    expect(screen.queryByText("Priya Patel")).toBeNull();
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.queryByText("Sales Team")).toBeNull();
  });

  it("shows an empty state when there are no contacts", async () => {
    h.chatService.getContacts.mockResolvedValue([]);
    render(<Chat />);
    await waitFor(() => expect(h.chatService.getContacts).toHaveBeenCalled());
    expect(await screen.findByText(/no contacts|no staff|no conversations/i)).toBeInTheDocument();
  });

  it("presence dot is not hard-coded green: a contact with no online info is not shown as online", async () => {
    await renderChat();
    const priyaRow = screen.getByText("Priya Patel").closest("button")!;
    expect(priyaRow.querySelector(".bg-success")).toBeNull();
  });
});

describe("Opening a thread", () => {
  it("loads history, clears the contact's unread badge and lowers the sidebar badge", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    expect(h.chatService.getHistory).toHaveBeenCalledWith("u1", undefined, undefined, undefined);
    await screen.findByText("Hi Mona");
    expect(h.setChatUnreadCount).toHaveBeenCalled();
    const updater = h.setChatUnreadCount.mock.calls[0][0];
    expect(updater(5)).toBe(3);
  });

  it("own bubbles are right-aligned, incoming left-aligned; timestamps in local time", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    const incoming = (await screen.findByText("Hi Mona")).closest("div.flex")!;
    const outgoing = screen.getByText("Hello Ravi").closest("div.flex")!;
    expect(incoming.className).toContain("justify-start");
    expect(outgoing.className).toContain("justify-end");
    expect(screen.getAllByText(format(new Date(T1), "hh:mm a")).length).toBeGreaterThan(0);
  });

  it("read ticks: double check for read, single check for unread own messages", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    const readBubble = (await screen.findByText("Hello Ravi")).closest("div.flex")!;
    const unreadBubble = screen.getByText("Unread reply").closest("div.flex")!;
    expect(readBubble.querySelector(".lucide-check-check")).not.toBeNull();
    expect(unreadBubble.querySelector(".lucide-check-check")).toBeNull();
    expect(unreadBubble.querySelector(".lucide-check")).not.toBeNull();
  });

  it("group thread shows member count and the sender name on incoming bubbles", async () => {
    h.chatService.getHistory.mockResolvedValue([{ _id: "gm1", message: "Target hit", createdAt: T1, sender: { _id: "u1", firstname: "Ravi", lastname: "Shah" } }]);
    await renderChat();
    await openContact("Sales Team");
    expect(h.chatService.getHistory).toHaveBeenCalledWith("g1", undefined, undefined, true);
    expect(screen.getByText("3 members")).toBeInTheDocument();
    expect(await screen.findByText("Ravi")).toBeInTheDocument();
  });
});

describe("Input bar", () => {
  it("Enter sends the message and clears the input; the bubble appears", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    fireEvent.change(input(), { target: { value: "Invoice #102 attached" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    await waitFor(() => expect(h.chatService.sendMessage).toHaveBeenCalledWith("u1", "Invoice #102 attached", undefined));
    expect(input().value).toBe("");
    expect(await screen.findByText("Invoice #102 attached")).toBeInTheDocument();
  });

  it("blank and spaces-only messages are blocked (Enter and Send button)", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    fireEvent.keyDown(input(), { key: "Enter" });
    fireEvent.change(input(), { target: { value: "    " } });
    fireEvent.keyDown(input(), { key: "Enter" });
    fireEvent.click(document.querySelector(".lucide-send")!.closest("button")!);
    expect(h.chatService.sendMessage).not.toHaveBeenCalled();
  });

  it("Shift+Enter inserts a new line instead of sending (multi-line support)", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    fireEvent.change(input(), { target: { value: "line one" } });
    fireEvent.keyDown(input(), { key: "Enter", shiftKey: true });
    expect(h.chatService.sendMessage).not.toHaveBeenCalled();
    expect(input().tagName).toBe("TEXTAREA");
  });

  it("emoji button opens the picker and the chosen emoji is appended to the draft", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    fireEvent.change(input(), { target: { value: "Great " } });
    fireEvent.click(document.querySelector(".lucide-smile")!.closest("button")!);
    fireEvent.click(screen.getByTestId("emoji-😀"));
    expect(input().value).toBe("Great 😀");
    expect(screen.queryByTestId("emoji-😀")).toBeNull();
  });

  it("attachment (paperclip) button opens a file chooser", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    fireEvent.click(document.querySelector(".lucide-paperclip")!.closest("button")!);
    expect(document.querySelector("input[type='file']")).not.toBeNull();
  });

  it("a failed send keeps the text AND shows a failed/retry indicator", async () => {
    h.chatService.sendMessage.mockRejectedValue(new Error("offline"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await renderChat();
    await openContact("Ravi Shah");
    fireEvent.change(input(), { target: { value: "will fail" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    await waitFor(() => expect(input().value).toBe("will fail"));
    expect(screen.queryByText(/failed|retry|could not send/i)).not.toBeNull();
    err.mockRestore();
  });

  it("draft text is kept per contact when switching threads", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    fireEvent.change(input(), { target: { value: "draft for Ravi" } });
    fireEvent.click(screen.getByText("Priya Patel"));
    await waitFor(() => expect(h.chatService.getHistory).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByText("Ravi Shah"));
    await waitFor(() => expect(h.chatService.getHistory).toHaveBeenCalledTimes(3));
    expect(input().value).toBe("draft for Ravi");
  });
});

describe("Messages actions", () => {
  it("only own messages have a delete button", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    const incoming = (await screen.findByText("Hi Mona")).closest("div.flex")!;
    const outgoing = screen.getByText("Hello Ravi").closest("div.flex")!;
    expect(within(incoming as HTMLElement).queryByTitle("Delete Message")).toBeNull();
    expect(within(outgoing as HTMLElement).getByTitle("Delete Message")).toBeInTheDocument();
  });

  it("deleting a message asks for confirmation once before calling the API", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await renderChat();
    await openContact("Ravi Shah");
    const outgoing = (await screen.findByText("Hello Ravi")).closest("div.flex")!;
    fireEvent.click(within(outgoing as HTMLElement).getByTitle("Delete Message"));
    const dialog = screen.queryByRole("alertdialog");
    expect(confirm.mock.calls.length === 1 || !!dialog).toBe(true);
    expect(h.chatService.deleteMessage).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});

describe("New Group modal", () => {
  const openModal = async () => {
    await renderChat();
    fireEvent.click(screen.getByRole("button", { name: "Create Group" }));
    return screen.findByRole("dialog");
  };

  it("opens with name + staff picker (groups excluded); Create disabled until name and a member", async () => {
    const dialog = await openModal();
    expect(within(dialog).getByText("Ravi Shah")).toBeInTheDocument();
    expect(within(dialog).queryByText("Sales Team")).toBeNull();
    const create = within(dialog).getByRole("button", { name: "Create Group" });
    expect(create).toBeDisabled();
    fireEvent.change(within(dialog).getByPlaceholderText("Enter group name"), { target: { value: "Field Team" } });
    expect(create).toBeDisabled();
    fireEvent.click(within(dialog).getByLabelText("Ravi Shah"));
    expect(create).toBeEnabled();
    fireEvent.click(create);
    await waitFor(() => expect(h.chatService.createGroup).toHaveBeenCalledWith("Field Team", ["u1"]));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("spaces-only group name keeps Create disabled", async () => {
    const dialog = await openModal();
    fireEvent.change(within(dialog).getByPlaceholderText("Enter group name"), { target: { value: "    " } });
    fireEvent.click(within(dialog).getByLabelText("Ravi Shah"));
    expect(within(dialog).getByRole("button", { name: "Create Group" })).toBeDisabled();
  });

  it("closing with Esc discards the draft (Cancel saves nothing)", async () => {
    const dialog = await openModal();
    fireEvent.change(within(dialog).getByPlaceholderText("Enter group name"), { target: { value: "Temp" } });
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Create Group" }));
    expect(((await screen.findByPlaceholderText("Enter group name")) as HTMLInputElement).value).toBe("");
    expect(h.chatService.createGroup).not.toHaveBeenCalled();
  });
});

describe("Group header menu", () => {
  const openMenu = async () => {
    const trigger = document.querySelector(".lucide-ellipsis-vertical, .lucide-more-vertical")!.closest("button")!;
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    return screen.findByRole("menu");
  };

  it("group admin sees Add Member + Delete Group; a member sees Exit Group", async () => {
    await renderChat();
    await openContact("Sales Team");
    expect(screen.getByTitle("Add Member")).toBeInTheDocument();
    let menu = await openMenu();
    expect(within(menu).getByText("Delete Group")).toBeInTheDocument();
    expect(within(menu).queryByText("Exit Group")).toBeNull();
    cleanup();
    h.sockets.length = 0;
    await renderChat();
    await openContact("Ops Team");
    expect(screen.queryByTitle("Add Member")).toBeNull();
    menu = await openMenu();
    expect(within(menu).getByText("Exit Group")).toBeInTheDocument();
  });

  it("Delete Group asks for confirmation before deleting", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await renderChat();
    await openContact("Sales Team");
    const menu = await openMenu();
    fireEvent.click(within(menu).getByText("Delete Group"));
    await new Promise((r) => setTimeout(r, 50));
    expect(h.chatService.deleteGroup).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});

describe("Real-time (socket) behaviour", () => {
  it("joins the user's room on connect", async () => {
    await renderChat();
    expect(h.sockets.some((s) => s.emitted.some((e: any[]) => e[0] === "join" && e[1] === "me"))).toBe(true);
  });

  it("incoming message for another contact bumps that contact's unread badge", async () => {
    await renderChat();
    act(() => chatSocket().fire("newMessage", { _id: "x1", message: "New from Priya", createdAt: T2, sender: { _id: "u2", firstname: "Priya", lastname: "Patel" } }));
    const row = (await screen.findByText("New from Priya")).closest("button")!;
    expect(within(row).getByText("1")).toBeInTheDocument();
  });

  it("incoming message in the open thread is appended and marked read", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    act(() => chatSocket().fire("newMessage", { _id: "x2", message: "Live reply", createdAt: T2, sender: { _id: "u1", firstname: "Ravi", lastname: "Shah" } }));
    expect(await screen.findAllByText("Live reply")).not.toHaveLength(0);
    expect(h.chatService.markAsRead).toHaveBeenCalledWith("u1", undefined);
  });

  it("messagesRead turns my single ticks into double ticks", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    const unread = (await screen.findByText("Unread reply")).closest("div.flex")!;
    expect(unread.querySelector(".lucide-check-check")).toBeNull();
    act(() => chatSocket().fire("messagesRead", "u1"));
    await waitFor(() => expect(screen.getByText("Unread reply").closest("div.flex")!.querySelector(".lucide-check-check")).not.toBeNull());
  });

  it("messageDeleted removes the bubble", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    await screen.findByText("Hi Mona");
    act(() => chatSocket().fire("messageDeleted", "m1"));
    await waitFor(() => expect(screen.queryByText("Hi Mona")).toBeNull());
  });

  it("after a socket reconnect it re-joins the room and fetches missed messages (after=<last timestamp>)", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    await screen.findByText("Hi Mona");
    const s = chatSocket();
    const joinsBefore = s.emitted.filter((e: any[]) => e[0] === "join").length;
    act(() => s.fire("connect"));
    act(() => s.fire("reconnect"));
    expect(s.emitted.filter((e: any[]) => e[0] === "join").length).toBeGreaterThan(joinsBefore);
    await waitFor(() => expect(h.chatService.getHistory).toHaveBeenCalledWith("u1", undefined, T2, undefined));
  });
});

describe("Calls", () => {
  it("1:1 call: caller and callee land in the SAME Jitsi room", async () => {
    // Mona (me) calls Ravi (u1)
    await renderChat();
    await openContact("Ravi Shah");
    fireEvent.click(screen.getByTitle("Video Call"));
    const roomFromMona = (await screen.findByTestId("jitsi")).textContent;
    cleanup();
    // Ravi (u1) joins from his side by opening Mona and clicking Video
    h.state.user = { _id: "u1", firstname: "Ravi", lastname: "Shah", email: "ravi@a.test" };
    h.chatService.getContacts.mockResolvedValue([{ _id: "me", firstname: "Mona", lastname: "Admin", email: "mona@a.test", admin: true, unreadCount: 0 }]);
    render(<Chat />);
    fireEvent.click(await screen.findByText("Mona Admin"));
    await screen.findByPlaceholderText("Type a message...");
    fireEvent.click(screen.getByTitle("Video Call"));
    const roomFromRavi = (await screen.findByTestId("jitsi")).textContent;
    expect(roomFromRavi).toBe(roomFromMona);
  });

  it("call invitation is posted to the thread once and End Call closes the call view", async () => {
    await renderChat();
    await openContact("Ravi Shah");
    fireEvent.click(screen.getByTitle("Voice Call"));
    await waitFor(() => expect(h.chatService.sendMessage).toHaveBeenCalledTimes(1));
    expect(h.chatService.sendMessage.mock.calls[0][1]).toMatch(/Voice Call/);
    fireEvent.click(screen.getByRole("button", { name: /End \/ Leave Call/ }));
    expect(screen.queryByTestId("jitsi")).toBeNull();
  });
});

describe("Mobile 375px", () => {
  it("after opening a thread there is a back arrow that returns to the contacts list", async () => {
    (window as any).innerWidth = 375;
    window.dispatchEvent(new Event("resize"));
    await renderChat();
    await openContact("Ravi Shah");
    const back = screen.queryByRole("button", { name: /back/i }) || document.querySelector(".lucide-arrow-left")?.closest("button");
    expect(back).toBeTruthy();
    (window as any).innerWidth = 1024;
  });
});

describe("Sidebar badge source — NotificationProvider.chatUnreadCount", () => {
  let NotificationProvider: any;
  beforeEach(async () => {
    const actual: any = await vi.importActual("@/context/NotificationContext");
    NotificationProvider = actual.NotificationProvider;
  });

  const renderProvider = async (path: string) => {
    const actual: any = await vi.importActual("@/context/NotificationContext");
    const RealHook = actual.useNotificationContext;
    const Reader = () => <span data-testid="badge">{RealHook().chatUnreadCount}</span>;
    window.history.pushState({}, "", path);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <NotificationProvider><Reader /></NotificationProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("badge").textContent).toBe("3")); // 2 + 1 + 0 + 0
    return h.sockets[h.sockets.length - 1];
  };

  it("starts at the sum of unread counts and increments on a new incoming message", async () => {
    const s = await renderProvider("/admin/dashboard");
    act(() => s.fire("newMessage", { _id: "n1", message: "hey", sender: { _id: "u2", firstname: "Priya" } }));
    expect(screen.getByTestId("badge").textContent).toBe("4");
    act(() => s.fire("newMessage", { _id: "n2", message: "mine", sender: { _id: "me", firstname: "Mona" } }));
    expect(screen.getByTestId("badge").textContent).toBe("4");
  });

  it("admin viewing that exact thread on /admin/chat: badge does not increase", async () => {
    sessionStorage.setItem("activeChatId", "u2");
    const s = await renderProvider("/admin/chat");
    act(() => s.fire("newMessage", { _id: "n3", message: "hey", sender: { _id: "u2", firstname: "Priya" } }));
    expect(screen.getByTestId("badge").textContent).toBe("3");
  });

  it("staff viewing that exact thread on /staff/chat: badge does not increase either", async () => {
    sessionStorage.setItem("activeChatId", "u2");
    const s = await renderProvider("/staff/chat");
    act(() => s.fire("newMessage", { _id: "n4", message: "hey", sender: { _id: "u2", firstname: "Priya" } }));
    expect(screen.getByTestId("badge").textContent).toBe("3");
  });
});
