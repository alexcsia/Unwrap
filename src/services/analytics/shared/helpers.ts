export type DateFilters = {
  year?: number;
  month?: number;
  date?: string;
  from?: string;
  to?: string;
};

export const resolveDateRange = (filters: DateFilters) => {
  const { year, month, date, from, to } = filters;

  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    return { startDate, endDate };
  }

  if (from && to) {
    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setDate(endDate.getDate() + 1);
    return { startDate, endDate };
  }

  if (year) {
    const startDate = new Date(year, month ? month - 1 : 0, 1);
    const endDate = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
    return { startDate, endDate };
  }

  return { startDate: new Date(0), endDate: new Date() };
};
