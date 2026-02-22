/**
 * Formats an ISO date string into a key for grouping (e.g., "YYYY-MM-DD").
 */
export const toDateKey = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Returns a human-readable label for a date key (e.g., "Today", "Yesterday", or a formatted date).
 */
export const formatDateLabel = (key) => {
    const [y, m, dm] = key.split("-").map(Number);
    const target = new Date(y, m - 1, dm);
    const today = new Date();
    const yday = new Date(today);
    yday.setDate(today.getDate() - 1);

    const sameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    if (sameDay(target, today)) return "Today";
    if (sameDay(target, yday)) return "Yesterday";
    return target.toLocaleDateString();
};

/**
 * Formats an ISO string into a local time string (e.g., "HH:MM AM/PM").
 */
export const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Checks if an ISO date string refers to the current local date.
 */
export const isToday = (iso) => {
    const d = new Date(iso);
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
};
