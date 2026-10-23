// These describe the JSON returned by the backend.
// PostgreSQL decimal amounts can arrive as strings, so both types are allowed.
export type Loan = {
  id: string;
  friendName: string;
  amount: string | number;
  dueDate: string;
  status: 'PENDING' | 'REPAID';
  createdAt: string;
  repaidAt: string | null;
  receiptPath: string | null;
};

export type Summary = {
  totalLent: string | number;
  totalRepaid: string | number;
  overdue: string | number;
};
