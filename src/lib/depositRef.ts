export function depositRef(username: string | null | undefined, salt = ""): string {
  const seed = `${(username || "guest").toLowerCase().trim()}::${salt}`;
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  const positive = h >>> 0;
  const code = positive.toString(36).toUpperCase().padStart(6, "0").slice(-6);
  return `EC-${code}`;
}
