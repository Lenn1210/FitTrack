import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, PageHeader, SectionTitle } from '../components';
import { colors } from '../theme';
import { dateKey, startOfWeek, workoutsThisWeek } from '../utils';

function metricValue(value, digits = 0) {
  return value == null ? '—' : Number(value).toLocaleString('nl-NL', { maximumFractionDigits: digits });
}

export function HomeScreen({ data, onNavigate, healthState }) {
  const week = workoutsThisWeek(data.workouts);
  const todayKey = dateKey(new Date());
  const todayWorkouts = data.workouts.filter((workout) => dateKey(workout.date) === todayKey);
  const today = new Date();
  const weekStart = startOfWeek(today);
  const days = ['M', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((label, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      label,
      count: data.workouts.filter((workout) => dateKey(workout.date) === dateKey(date)).length,
      isToday: dateKey(date) === todayKey,
    };
  });
  const goal = Number(data.profile.weeklyGoal) || 3;
  const goalProgress = Math.min(week.length / goal, 1);
  const hasHealthMeasurements = Boolean(healthState.summary && [
    healthState.summary.activeCalories,
    healthState.summary.steps,
    healthState.summary.exerciseMinutes,
    healthState.summary.heartRateBpm,
  ].some((value) => value != null));

  return (
    <>
      <PageHeader
        eyebrow="JOUW ACTIVITEIT"
        title={`Goed bezig${data.profile.name ? `, ${data.profile.name}` : ''}!`}
        subtitle={today.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
      />

      <Card style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <Text style={styles.healthHeading}>Apple Gezondheid</Text>
          <View style={[styles.statusDot, hasHealthMeasurements && styles.connectedDot]} />
        </View>
        <Text style={styles.healthDescription}>
          {!healthState.nativeAvailable
            ? 'De FitTrack-webapp kan geen gegevens uit Apple Gezondheid lezen. Dit vereist een aparte native iOS-app.'
            : healthState.healthAvailable === false
              ? 'HealthKit is niet beschikbaar op dit apparaat.'
              : hasHealthMeasurements
                ? 'Deze meetwaarden zijn vandaag daadwerkelijk uit HealthKit ontvangen.'
                : 'Nog geen meetwaarden ontvangen. Er zijn mogelijk geen samples of toegang ontbreekt; iOS maakt een leesweigering niet zichtbaar.'}
        </Text>
        {healthState.summary?.asOf ? (
          <Text style={styles.syncTime}>
            Bijgewerkt om {new Date(healthState.summary.asOf).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : null}
        <View style={styles.metricGrid}>
          {[
            { label: 'Actieve calorieën', value: metricValue(healthState.summary?.activeCalories), unit: 'kcal', icon: '◉' },
            { label: 'Stappen', value: metricValue(healthState.summary?.steps), unit: 'stappen', icon: '↗' },
            { label: 'Trainingsminuten', value: metricValue(healthState.summary?.exerciseMinutes), unit: 'min', icon: '◷' },
          ].map((metric) => (
            <View key={metric.label} style={styles.metric}>
              <Text style={styles.metricIcon}>{metric.icon}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricUnit}>{metric.unit}</Text>
            </View>
          ))}
        </View>
        <View style={styles.heartRate}>
          <Text style={styles.heartIcon}>♡</Text>
          <Text style={styles.heartText}>Hartslag</Text>
          <Text style={styles.notAvailable}>
            {healthState.summary?.heartRateBpm == null ? 'geen meting' : `${metricValue(healthState.summary.heartRateBpm)} bpm`}
          </Text>
        </View>
        {!healthState.nativeAvailable ? (
          <Text style={styles.chartNote}>Er worden geen gezondheidsmetingen getoond of verzonnen in de webapp.</Text>
        ) : null}
        {healthState.error ? <Text style={styles.healthError}>{healthState.error}</Text> : null}
        <Button
          title={healthState.loading ? 'Gegevens laden…' : 'Beschikbaarheid bekijken'}
          secondary
          onPress={() => onNavigate('profile')}
          style={styles.healthButton}
        />
      </Card>

      <SectionTitle title="Dagelijkse doelen" />
      <Card style={styles.goalsCard}>
        <View style={styles.goalRow}>
          <Text style={styles.goalName}>Stappen</Text>
          <Text style={styles.goalValue}>{Number(data.profile.stepGoal).toLocaleString('nl-NL')} <Text style={styles.goalUnit}>per dag</Text></Text>
        </View>
        <View style={styles.goalDivider} />
        <View style={styles.goalRow}>
          <Text style={styles.goalName}>Actieve calorieën</Text>
          <Text style={styles.goalValue}>{data.profile.calorieGoal} <Text style={styles.goalUnit}>kcal per dag</Text></Text>
        </View>
        <Text style={styles.chartNote}>Doelen zijn zelf ingesteld; gezondheidsmetingen zijn niet beschikbaar in de webapp.</Text>
      </Card>

      <SectionTitle title="Deze week" />
      <Card>
        <View style={styles.weekSummary}>
          <View>
            <Text style={styles.bigNumber}>{week.length}</Text>
            <Text style={styles.mutedText}>trainingen deze week</Text>
          </View>
          <Text style={styles.goalLabel}>Doel: {goal}×</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${goalProgress * 100}%` }]} />
        </View>
        <View style={styles.weekBars}>
          {days.map((day, index) => (
            <View key={`${day.label}-${index}`} style={styles.dayColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, day.count > 0 && styles.barActive, day.isToday && styles.barToday, { height: day.count ? 38 : 8 }]} />
              </View>
              <Text style={[styles.dayLabel, day.isToday && styles.todayLabel]}>{day.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.chartNote}>Grafiek gebaseerd op je opgeslagen trainingen.</Text>
      </Card>

      <SectionTitle title="Vandaag" />
      {todayWorkouts.length ? (
        todayWorkouts.map((workout) => (
          <Card key={workout.id}>
            <Text style={styles.workoutName}>{workout.name}</Text>
            <Text style={styles.mutedText}>
              {workout.exercises.length} oefeningen{workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ''}
            </Text>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nog geen training opgeslagen voor vandaag.</Text>
          <Button title="Training starten" onPress={() => onNavigate('workout')} />
        </Card>
      )}
      <Text style={styles.dataFootnote}>Je trainingsgegevens worden lokaal op dit apparaat bewaard.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  healthCard: { borderColor: colors.accentSoft },
  healthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  healthHeading: { color: colors.text, fontSize: 16, fontWeight: '700' },
  healthDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  syncTime: { color: colors.muted, fontSize: 10, marginTop: -7, marginBottom: 10 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.muted },
  connectedDot: { backgroundColor: colors.success },
  healthError: { color: colors.danger, fontSize: 11, lineHeight: 16, marginTop: 10 },
  healthButton: { marginTop: 12 },
  goalsCard: { paddingVertical: 6 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  goalName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  goalValue: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  goalUnit: { color: colors.muted, fontSize: 10, fontWeight: '500' },
  goalDivider: { height: 1, backgroundColor: colors.border },
  metricGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metric: { flex: 1, backgroundColor: colors.background, borderRadius: 13, padding: 11 },
  metricIcon: { color: colors.accent, fontSize: 16, marginBottom: 8 },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  metricUnit: { color: colors.muted, fontSize: 10, marginTop: 3 },
  heartRate: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heartIcon: { color: colors.danger, fontSize: 18 },
  heartText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  notAvailable: { color: colors.muted, fontSize: 12, marginLeft: 'auto' },
  weekSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigNumber: { color: colors.text, fontSize: 30, fontWeight: '800' },
  mutedText: { color: colors.muted, fontSize: 12, marginTop: 3 },
  goalLabel: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  progressTrack: { height: 6, backgroundColor: colors.background, borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  weekBars: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  dayColumn: { alignItems: 'center', gap: 8 },
  barTrack: { height: 42, justifyContent: 'flex-end' },
  barFill: { width: 18, borderRadius: 7, backgroundColor: colors.border },
  barActive: { backgroundColor: colors.success },
  barToday: { backgroundColor: colors.accent },
  dayLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  todayLabel: { color: colors.accent },
  chartNote: { color: colors.muted, fontSize: 10, marginTop: 13 },
  workoutName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptyCard: { gap: 15 },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  dataFootnote: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 12, marginBottom: 4 },
});
