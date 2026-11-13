import { StyleSheet, Text, View } from 'react-native';
import { Card, PageHeader, SectionTitle } from '../components';
import { colors } from '../theme';
import { formatDate, startOfWeek, workoutsThisWeek } from '../utils';

export function ProgressScreen({ data, healthState }) {
  const now = new Date();
  const thisWeekCount = workoutsThisWeek(data.workouts, now).length;
  const thisMonthCount = data.workouts.filter((workout) => {
    const date = new Date(workout.date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
  const last28Days = data.workouts.filter((workout) => new Date(workout.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27)).length;
  const weeklyFrequency = (last28Days / 4).toFixed(1);
  const weekStart = startOfWeek(now);
  const weekBars = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return {
      label: ['M', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'][index],
      count: data.workouts.filter((workout) => new Date(workout.date).toDateString() === day.toDateString()).length,
    };
  });
  const maxCount = Math.max(...weekBars.map((day) => day.count), 1);
  const records = new Map();
  data.workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const key = exercise.name.toLowerCase();
      const current = records.get(key);
      if (!current || exercise.weightKg > current.weightKg) {
        records.set(key, { name: exercise.name, weightKg: exercise.weightKg, date: workout.date });
      }
    });
  });
  const personalRecords = [...records.values()].filter((record) => record.weightKg > 0).sort((a, b) => b.weightKg - a.weightKg);
  const exerciseProgress = [...records.keys()].slice(0, 5).map((key) => {
    const logs = data.workouts
      .flatMap((workout) => workout.exercises
        .filter((exercise) => exercise.name.toLowerCase() === key)
        .map((exercise) => ({ ...exercise, date: workout.date })))
      .filter((exercise) => exercise.weightKg > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-5);
    return { name: records.get(key).name, logs };
  }).filter((item) => item.logs.length > 0);
  const totalMinutes = data.workouts.reduce((total, workout) => total + (workout.durationMinutes || 0), 0);
  const activeCalories = healthState?.summary?.activeCalories;

  return (
    <>
      <PageHeader eyebrow="JOUW ONTWIKKELING" title="Voortgang" subtitle="Trainingscijfers uit je geschiedenis. HealthKit werkt niet in de webapp." />
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}><Text style={styles.statNumber}>{thisWeekCount}</Text><Text style={styles.statLabel}>deze week</Text></Card>
        <Card style={styles.statCard}><Text style={styles.statNumber}>{thisMonthCount}</Text><Text style={styles.statLabel}>deze maand</Text></Card>
        <Card style={styles.statCard}><Text style={styles.statNumber}>{weeklyFrequency}</Text><Text style={styles.statLabel}>trainingen / week*</Text></Card>
        <Card style={styles.statCard}><Text style={styles.statNumber}>{totalMinutes}</Text><Text style={styles.statLabel}>trainingsminuten totaal</Text></Card>
        <Card style={styles.statCard}><Text style={styles.statNumber}>{activeCalories == null ? '—' : Math.round(activeCalories)}</Text><Text style={styles.statLabel}>actieve kcal vandaag†</Text></Card>
      </View>
      <Text style={styles.finePrint}>* Gemiddelde over de afgelopen 4 weken.</Text>
      <Text style={styles.finePrint}>† Actieve calorieën zijn alleen beschikbaar via HealthKit in een native iOS-app.</Text>

      <SectionTitle title="Trainingsfrequentie" />
      <Card>
        <View style={styles.chart}>
          {weekBars.map((day, index) => (
            <View key={index} style={styles.chartColumn}>
              <Text style={styles.barCount}>{day.count || ''}</Text>
              <View style={styles.barBackground}>
                <View style={[styles.chartBar, { height: day.count ? Math.max(12, (day.count / maxCount) * 92) : 5 }]} />
              </View>
              <Text style={styles.chartLabel}>{day.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.finePrint}>Trainingen per dag deze week.</Text>
      </Card>

      <SectionTitle title="Persoonlijke records" />
      {personalRecords.length ? personalRecords.map((record) => (
        <Card key={record.name} style={styles.recordCard}>
          <View style={styles.recordIcon}><Text style={styles.trophy}>★</Text></View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordName}>{record.name}</Text>
            <Text style={styles.finePrint}>{formatDate(record.date)}</Text>
          </View>
          <Text style={styles.recordWeight}>{record.weightKg} kg</Text>
        </Card>
      )) : (
        <Card><Text style={styles.emptyText}>Je records verschijnen hier zodra je gewichten opslaat bij een oefening.</Text></Card>
      )}

      <SectionTitle title="Gewicht per oefening" />
      {exerciseProgress.length ? exerciseProgress.map((exercise) => {
        const maximum = Math.max(...exercise.logs.map((log) => log.weightKg), 1);
        return (
          <Card key={exercise.name}>
            <View style={styles.progressHeader}>
              <Text style={styles.recordName}>{exercise.name}</Text>
              <Text style={styles.recordWeight}>{exercise.logs[exercise.logs.length - 1].weightKg} kg</Text>
            </View>
            <View style={styles.miniChart}>
              {exercise.logs.map((log, index) => (
                <View key={`${log.date}-${index}`} style={styles.miniBarColumn}>
                  <View style={[styles.miniBar, { height: Math.max(6, (log.weightKg / maximum) * 45) }]} />
                  <Text style={styles.miniLabel}>{new Date(log.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</Text>
                </View>
              ))}
            </View>
          </Card>
        );
      }) : (
        <Card><Text style={styles.emptyText}>Voeg gewichten toe aan oefeningen om je ontwikkeling te zien.</Text></Card>
      )}

      <SectionTitle title="Recente trainingen" />
      {data.workouts.slice(0, 5).length ? data.workouts.slice(0, 5).map((workout) => (
        <Card key={workout.id} style={styles.historyCard}>
          <View style={styles.historyText}>
            <Text style={styles.recordName}>{workout.name}</Text>
            <Text style={styles.finePrint}>
              {formatDate(workout.date)} · {workout.source === 'healthkit' ? 'Apple Gezondheid' : `${workout.exercises.length} oefeningen`}
            </Text>
          </View>
          {workout.durationMinutes ? <Text style={styles.duration}>{workout.durationMinutes} min</Text> : null}
        </Card>
      )) : (
        <Card><Text style={styles.emptyText}>Je geschiedenis wordt gevuld wanneer je je eerste training opslaat.</Text></Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', flexGrow: 1, marginBottom: 0, minHeight: 90, justifyContent: 'center' },
  statNumber: { color: colors.accent, fontSize: 26, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 5 },
  finePrint: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', height: 130, paddingTop: 8 },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barCount: { color: colors.muted, fontSize: 10, height: 15 },
  barBackground: { height: 94, justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: 18, backgroundColor: colors.accent, borderRadius: 7 },
  chartLabel: { color: colors.muted, fontSize: 10, marginTop: 7 },
  recordCard: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  recordIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  trophy: { color: colors.accent, fontSize: 17 },
  recordInfo: { flex: 1 },
  recordName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  recordWeight: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 13, height: 75 },
  miniBarColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  miniBar: { width: '65%', maxWidth: 24, backgroundColor: colors.success, borderRadius: 5 },
  miniLabel: { color: colors.muted, fontSize: 8 },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  historyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyText: { flex: 1 },
  duration: { color: colors.accent, fontSize: 12, fontWeight: '700' },
});
