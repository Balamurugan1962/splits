export interface Member {
  id: string;
  name: string;
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

export interface Group {
  id: string;
  name: string;
  payeeId: string;
  currency: string;
  members: Member[];
  items: Item[];
  createdAt: number;
}

export const CURRENCIES = [
  { symbol: "₹", label: "Indian Rupee (₹)" },
  { symbol: "$", label: "US Dollar ($)" },
  { symbol: "€", label: "Euro (€)" },
  { symbol: "£", label: "British Pound (£)" },
  { symbol: "¥", label: "Japanese Yen (¥)" },
] as const;
