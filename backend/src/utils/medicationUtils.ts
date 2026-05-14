/**
 * Utility to compute upcoming doses given a start datetime and interval in hours.
 */
export function calculateNextDoses(
  startDate: Date | string,
  intervalHours: number,
  count: number = 5
): Date[] {
  const doses: Date[] = [];

  const initial = typeof startDate === 'string' ? new Date(startDate) : startDate;
  let currentDoseTime = new Date(initial.getTime());

  for (let i = 0; i < count; i++) {
    doses.push(new Date(currentDoseTime.getTime()));
    currentDoseTime.setHours(currentDoseTime.getHours() + intervalHours);
  }

  return doses;
}

