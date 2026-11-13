export function dateKey(date) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function workoutsOnDate(workouts, key) {
  return workouts.filter((workout) => dateKey(workout.date) === key);
}

export function startOfWeek(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
  return value;
}

export function workoutsThisWeek(workouts, date = new Date()) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return workouts.filter((workout) => {
    const workoutDate = new Date(workout.date);
    return workoutDate >= start && workoutDate < end;
  });
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}
