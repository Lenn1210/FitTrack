import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Field, PageHeader, Pill, SectionTitle } from '../components';
import { colors, muscleGroups } from '../theme';

export function WorkoutScreen({ data, onSaveWorkout }) {
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState(muscleGroups[0]);
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [draftExercises, setDraftExercises] = useState([]);

  function chooseExercise(exercise) {
    setExerciseName(exercise.name);
    setMuscleGroup(exercise.muscleGroup);
  }

  function addExercise() {
    const name = exerciseName.trim();
    const weightKg = weight.trim() ? Number(weight.replace(',', '.')) : 0;
    const setCount = Number(sets);
    const repCount = Number(reps);

    if (!name || !Number.isFinite(weightKg) || weightKg < 0 || !Number.isInteger(setCount) || setCount < 1 ||
      !Number.isInteger(repCount) || repCount < 1) {
      Alert.alert('Controleer je invoer', 'Vul een oefening, een geldig gewicht en minimaal 1 set en herhaling in.');
      return;
    }

    setDraftExercises((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        name,
        muscleGroup,
        weightKg,
        sets: setCount,
        reps: repCount,
        notes: exerciseNotes.trim(),
      },
    ]);
    setExerciseName('');
    setWeight('');
    setExerciseNotes('');
  }

  function saveWorkout() {
    const name = workoutName.trim();
    const durationMinutes = duration.trim() ? Number(duration) : null;
    if (!name) {
      Alert.alert('Naam ontbreekt', 'Geef je training eerst een naam.');
      return;
    }
    if (!draftExercises.length) {
      Alert.alert('Geen oefeningen', 'Voeg minstens één oefening toe voordat je opslaat.');
      return;
    }
    if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 1)) {
      Alert.alert('Ongeldige duur', 'Vul een heel aantal minuten in.');
      return;
    }

    onSaveWorkout({
      name,
      durationMinutes,
      notes: workoutNotes.trim(),
      exercises: draftExercises,
    });
  }

  return (
    <>
      <PageHeader eyebrow="NIEUWE SESSIE" title="Training" subtitle="Leg je oefeningen vast. Je training wordt lokaal opgeslagen." />
      <Card>
        <Field label="Naam training" value={workoutName} onChangeText={setWorkoutName} placeholder="Bijv. Push day" />
        <Field label="Duur in minuten (optioneel)" value={duration} onChangeText={setDuration} placeholder="Bijv. 45" keyboardType="number-pad" />
        <Field label="Notities bij training (optioneel)" value={workoutNotes} onChangeText={setWorkoutNotes} placeholder="Hoe ging je training?" multiline />
      </Card>

      <SectionTitle title="Oefening toevoegen" />
      <Card>
        <Text style={styles.sectionHint}>Kies uit je bibliotheek of typ zelf een oefening.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exercisePicker}>
          {data.exercises.map((exercise) => (
            <Pill
              key={exercise.id}
              label={exercise.name}
              selected={exerciseName === exercise.name}
              onPress={() => chooseExercise(exercise)}
            />
          ))}
        </ScrollView>
        <Field label="Oefening" value={exerciseName} onChangeText={setExerciseName} placeholder="Naam oefening" />
        <Text style={styles.label}>Spiergroep</Text>
        <View style={styles.pills}>
          {muscleGroups.map((group) => (
            <Pill key={group} label={group} selected={muscleGroup === group} onPress={() => setMuscleGroup(group)} />
          ))}
        </View>
        <View style={styles.numericRow}>
          <Field label="Gewicht (kg)" value={weight} onChangeText={setWeight} placeholder="0" keyboardType="decimal-pad" style={styles.numericField} />
          <Field label="Sets" value={sets} onChangeText={setSets} placeholder="3" keyboardType="number-pad" style={styles.numericField} />
          <Field label="Herhalingen" value={reps} onChangeText={setReps} placeholder="10" keyboardType="number-pad" style={styles.numericField} />
        </View>
        <Field label="Notitie (optioneel)" value={exerciseNotes} onChangeText={setExerciseNotes} placeholder="Bijv. rustig tempo" />
        <Button title="＋  Voeg oefening toe" onPress={addExercise} />
      </Card>

      <SectionTitle title={`Oefeningen in deze training · ${draftExercises.length}`} />
      {draftExercises.length ? (
        draftExercises.map((exercise) => (
          <Card key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseSummary}>
              <View style={styles.exerciseText}>
                <Text style={styles.exerciseTitle}>{exercise.name}</Text>
                <Text style={styles.exerciseDetails}>{exercise.muscleGroup} · {exercise.sets} × {exercise.reps}{exercise.weightKg ? ` · ${exercise.weightKg} kg` : ''}</Text>
                {exercise.notes ? <Text style={styles.exerciseDetails}>{exercise.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => setDraftExercises((current) => current.filter((item) => item.id !== exercise.id))}>
                <Text style={styles.remove}>×</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))
      ) : (
        <Card><Text style={styles.sectionHint}>Je hebt nog geen oefeningen toegevoegd.</Text></Card>
      )}
      <Button title="Training opslaan" onPress={saveWorkout} disabled={!draftExercises.length} style={styles.saveButton} />
      <Text style={styles.footerNote}>Trainingen van Apple Watch of Apple Gezondheid kunnen niet rechtstreeks met deze webapp worden gesynchroniseerd.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  exercisePicker: { marginHorizontal: -2, marginBottom: 8 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 7 },
  numericRow: { flexDirection: 'row', gap: 8 },
  numericField: { flex: 1 },
  exerciseCard: { paddingVertical: 13 },
  exerciseSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseText: { flex: 1 },
  exerciseTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  exerciseDetails: { color: colors.muted, fontSize: 11, marginTop: 4 },
  remove: { color: colors.danger, fontSize: 23, paddingHorizontal: 5 },
  saveButton: { marginTop: 4 },
  footerNote: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 12 },
});
