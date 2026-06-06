const KEY = "ec_first_deposit_used_v1";

export function consumeFirstDepositGift(): boolean {
  try {
    if (localStorage.getItem(KEY)) return false;
    localStorage.setItem(KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export function hasUsedFirstDepositGift(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
