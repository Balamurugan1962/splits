export interface Member {
  id: string;
  name: string;
  upiId?: string;
  upiName?: string;
}

export interface ItemShare {
  memberId: string;
  amount: number;
  locked: boolean;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  includedMemberIds: string[];
  shares: ItemShare[];
}

export interface SplitSession {
  id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  payeeId: string;
  items: Item[];
  status?: "active" | "closed";
  closedAt?: number;
  paidMemberIds?: string[];
}

export interface Group {
  id: string;
  name: string;
  payeeId: string;
  currency: string;
  members: Member[];
  items: Item[];
  createdAt: number;
  ownerId?: string;
  splits?: SplitSession[];
}

export const CURRENCIES = [
  { symbol: "₹", label: "Indian Rupee (₹)" },
  { symbol: "$", label: "US Dollar ($)" },
  { symbol: "€", label: "Euro (€)" },
  { symbol: "£", label: "British Pound (£)" },
  { symbol: "¥", label: "Japanese Yen (¥)" },
] as const;
