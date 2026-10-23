import type { Loan } from './types';

export function utcToday() {
  // Match the backend's UTC date when deciding whether a loan is overdue.
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(loan: Loan) {
  return loan.status === 'PENDING' && loan.dueDate.slice(0, 10) < utcToday();
}

export function money(value: string | number) {
  return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function dateLabel(value: string) {
  const date = new Date(value.slice(0, 10) + 'T00:00:00Z');
  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
