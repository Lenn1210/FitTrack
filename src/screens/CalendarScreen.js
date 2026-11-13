import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Field, PageHeader, Pill, SectionTitle } from '../components';
import { colors, muscleGroups } from '../theme';
import { dateKey, formatDate, workoutsOnDate } from '../utils';

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const WEEKDAYS = ['M', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export function CalendarScreen({ data, onSaveExercises }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [exerciseName, setExerciseName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState(muscleGroups[0]);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const count = new Date(year, monthIndex + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [month]);

  const selectedWorkouts = workoutsOnDate(data.workouts, selectedDate);

  function changeMonth(amount) {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next);
    setSelectedDate(dateKey(next));
  }

  async function addExercise() {
    const name = exerciseName.trim();
    if (!name) {
      Alert.alert('Naam ontbreekt', 'Vul eerst de naam van de oefening in.');
      return;
    }
    if (data.exercises.some((exercise) => exercise.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Oefening bestaat al', 'Deze oefening staat al in je bibliotheek.');
      return;
    }
    const saved = await onSaveExercises([
      ...data.exercises,
      { id: `${Date.now()}`, name, muscleGroup },
    ]);
    if (saved) setExerciseName('');
  }

  async function removeExercise(exercise) {
    Alert.alert('Oefening verwijderen?', `${exercise.name} wordt uit je bibliotheek verwijderd. Bestaande trainingen blijven bewaard.`, [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: () => onSaveExercises(data.exercises.filter((item) => item.id !== exercise.id)),
      },
    ]);
  }

  return (
    <>
      <PageHeader eyebrow="JOUW GESCHIEDENIS" title="Trainingsdagen" subtitle="Bekijk je trainingen en beheer je oefeningen." />
      <Card>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}><Text style={styles.monthArrow}>‹</Text></TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}><Text style={styles.monthArrow}>›</Text></TouchableOpacity>
        </View>
        <View style={styles.grid}>
          {WEEKDAYS.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
          {calendarDays.map((day, index) => {
            if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
            const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
            const trained = workoutsOnDate(data.workouts, key).length > 0;
            const selected = key === selectedDate;
            return (
              <TouchableOpacity key={key} onPress={() => setSelectedDate(key)} style={[styles.dayCell, selected && styles.selectedDay]}>
                <Text style={[styles.dayNumber, selected && styles.selectedDayText]}>{day}</Text>
                {trained ? <View style={[styles.dayDot, selected && styles.selectedDot]} /> : <View style={styles.emptyDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.calendarLegend}><Text style={styles.legendDot}>●</Text> trainingsdag</Text>
      </Card>

      <SectionTitle title={formatDate(`${selectedDate}T12:00:00`)} />
      {selectedWorkouts.length ? selectedWorkouts.map((workout) => (
        <Card key={workout.id}>
          <View style={styles.workoutHeader}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>{workout.name}</Text>
              <Text style={styles.note}>
                {new Date(workout.date).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                {workout.source === 'healthkit' ? ' · Apple Gezondheid' : ''}
              </Text>
            </View>
            <View style={styles.workoutMetrics}>
              {workout.durationMinutes ? <Text style={styles.duration}>{workout.durationMinutes} min</Text> : null}
              {workout.activeCalories != null ? <Text style={styles.duration}>{Math.round(workout.activeCalories)} kcal</Text> : null}
            </View>
          </View>
          {workout.notes ? <Text style={styles.note}>{workout.notes}</Text> : null}
          {workout.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseRow}>
              <View style={styles.exerciseDot} />
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseDetails}>
                  {exercise.sets} sets × {exercise.reps} herhalingen{exercise.weightKg > 0 ? ` · ${exercise.weightKg} kg` : ''}
                </Text>
                {exercise.notes ? <Text style={styles.note}>{exercise.notes}</Text> : null}
              </View>
            </View>
          ))}
        </Card>
      )) : (
        <Card><Text style={styles.emptyText}>Geen trainingen gevonden op deze dag.</Text></Card>
      )}

      <SectionTitle title="Oefeningenbibliotheek" />
      <Card>
        <Text style={styles.sectionHint}>Voeg je eigen oefening toe of verwijder een oefening uit je lijst.</Text>
        <Field label="Naam oefening" value={exerciseName} onChangeText={setExerciseName} placeholder="Bijv. Goblet squat" />
        <Text style={styles.label}>Spiergroep</Text>
        <View style={styles.pills}>
          {muscleGroups.map((group) => (
            <Pill key={group} label={group} selected={muscleGroup === group} onPress={() => setMuscleGroup(group)} />
          ))}
        </View>
        <Button title="Oefening toevoegen" onPress={addExercise} style={styles.addButton} />
        <View style={styles.library}>
          {data.exercises.map((exercise) => (
            <TouchableOpacity key={exercise.id} style={styles.libraryItem} onLongPress={() => removeExercise(exercise)}>
              <View>
                <Text style={styles.libraryName}>{exercise.name}</Text>
                <Text style={styles.libraryGroup}>{exercise.muscleGroup}</Text>
              </View>
              <TouchableOpacity accessibilityLabel={`Verwijder ${exercise.name}`} onPress={() => removeExercise(exercise)}>
                <Text style={styles.remove}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionHint}>Tip: tik op × om een oefening te verwijderen.</Text>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  monthButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.background },
  monthArrow: { color: colors.accent, fontSize: 26, lineHeight: 28 },
  monthTitle: { color: colors.text, fontWeight: '700', fontSize: 16, textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { color: colors.muted, width: '14.285%', textAlign: 'center', fontSize: 11, fontWeight: '700', paddingBottom: 8 },
  dayCell: { width: '14.285%', height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 2 },
  selectedDay: { backgroundColor: colors.accent },
  dayNumber: { color: colors.text, fontSize: 13 },
  selectedDayText: { color: colors.background, fontWeight: '800' },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.success, marginTop: 2 },
  selectedDot: { backgroundColor: colors.background },
  emptyDot: { height: 6 },
  calendarLegend: { color: colors.muted, fontSize: 11, marginTop: 10 },
  legendDot: { color: colors.success },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 },
  workoutInfo: { flex: 1 },
  workoutMetrics: { alignItems: 'flex-end', gap: 4 },
  workoutTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  duration: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  exerciseRow: { flexDirection: 'row', marginTop: 13, gap: 10 },
  exerciseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginTop: 5 },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  exerciseDetails: { color: colors.muted, fontSize: 12, marginTop: 4 },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  sectionHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5 },
  addButton: { marginBottom: 15 },
  library: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
  libraryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  libraryName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  libraryGroup: { color: colors.muted, fontSize: 11, marginTop: 3 },
  remove: { color: colors.danger, fontSize: 22, paddingHorizontal: 8 },
});
