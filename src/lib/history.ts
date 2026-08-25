const DEPOSITS_KEY = "hal_deposits_v1";
const WITHDRAWS_KEY = "hal_withdraws_v1";

export type Deposit = {
  id: string;
  date: number;
  amount: number;
  asset: string;
  network: string;
  plan?: string;
};

export type Withdraw = {
  id: string;
  date: number;
  amount: number;
  address: string;
  status: "pending" | "sent";
};

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function recordDeposit(d: Omit<Deposit, "id" | "date">) {
  const next: Deposit = {
    ...d,
    id: Math.random().toString(36).slice(2, 10),
    date: Date.now(),
  };
  const list = [next, ...read<Deposit>(DEPOSITS_KEY)];
  write(DEPOSITS_KEY, list);
}

export function listDeposits(): Deposit[] {
  return read<Deposit>(DEPOSITS_KEY);
}

export function recordWithdraw(w: Omit<Withdraw, "id" | "date">) {
  const next: Withdraw = {
    ...w,
    id: Math.random().toString(36).slice(2, 10),
    date: Date.now(),
  };
  const list = [next, ...read<Withdraw>(WITHDRAWS_KEY)];
  write(WITHDRAWS_KEY, list);
}

export function listWithdraws(): Withdraw[] {
  return read<Withdraw>(WITHDRAWS_KEY);
}
