export const UI_TOAST_EVENT = "biocompute:toast";

export type ToastPayload = {
    message: string;
    kind?: "info" | "success" | "warning" | "error";
};

export function emitToast(payload: ToastPayload) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<ToastPayload>(UI_TOAST_EVENT, { detail: payload }));
}
