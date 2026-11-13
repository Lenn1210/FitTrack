import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, PageHeader, SectionTitle } from '../components';
import { colors } from '../theme';

export function ProfileScreen({
  data,
  onSaveProfile,
  onClearWorkouts,
  healthState,
  onRequestHealthAccess,
  onRefreshHealth,
}) {
  const [name, setName] = useState(data.profile.name);
  const [weeklyGoal, setWeeklyGoal] = useState(data.profile.weeklyGoal);
  const [stepGoal, setStepGoal] = useState(data.profile.stepGoal);
  const [calorieGoal, setCalorieGoal] = useState(data.profile.calorieGoal);

  async function saveProfile() {
    if (!name.trim()) {
      Alert.alert('Naam ontbreekt', 'Vul een naam in of herstel je profielnaam.');
      return;
    }
    for (const [label, value] of [['weekdoel', weeklyGoal], ['stappendoel', stepGoal], ['caloriedoel', calorieGoal]]) {
      if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        Alert.alert('Ongeldig doel', `Vul voor ${label} een heel getal groter dan 0 in.`);
        return;
      }
    }
    await onSaveProfile({ name: name.trim(), weeklyGoal, stepGoal, calorieGoal });
  }

  const summary = healthState.summary;
  const healthMetrics = [
    { label: 'Stappen', value: summary?.steps, unit: 'stappen' },
    { label: 'Actieve calorieën', value: summary?.activeCalories, unit: 'kcal' },
    { label: 'Hartslag', value: summary?.heartRateBpm, unit: 'bpm' },
    { label: 'Trainingsminuten', value: summary?.exerciseMinutes, unit: 'min' },
    { label: 'Trainingen vandaag', value: summary?.workoutCount, unit: 'trainingen' },
  ];
  const healthHasMeasurements = healthMetrics.some((metric) => metric.value != null);
  let healthStatusLabel = 'Toestemming nog niet aangevraagd';
  if (!healthState.nativeAvailable) {
    healthStatusLabel = 'Niet beschikbaar in de webapp';
  } else if (healthHasMeasurements) {
    healthStatusLabel = 'HealthKit-gegevens ontvangen';
  } else if (healthState.healthAvailable === false) {
    healthStatusLabel = 'HealthKit niet beschikbaar';
  } else if (healthState.authorizationRequested) {
    healthStatusLabel = 'Geen meetwaarden ontvangen';
  }

  let healthDescription = 'FitTrack leest alleen als je hieronder toestemming aanvraagt. De app schrijft geen gezondheidsgegevens naar Apple Gezondheid.';
  if (!healthState.nativeAvailable) {
    healthDescription = 'Browsers bieden FitTrack geen toegang tot Apple Gezondheid of HealthKit. Daarom toont en verzint deze webapp geen gezondheidsmetingen.';
  } else if (healthState.healthAvailable === false) {
    healthDescription = 'HealthKit is niet beschikbaar op dit apparaat.';
  } else if (healthState.authorizationRequested) {
    healthDescription = 'Mogelijk zijn er geen metingen of is toegang uitgeschakeld. iOS laat apps een geweigerde leesmachtiging niet herkennen.';
  }

  return (
    <>
      <PageHeader eyebrow="JOUW ACCOUNT" title="Profiel" subtitle="Beheer je gegevens, doelen en koppelingen." />
      <SectionTitle title="Persoonlijke gegevens" />
      <Card>
        <Field label="Naam" value={name} onChangeText={setName} placeholder="Je naam" />
        <Field label="Trainingsdoel per week" value={weeklyGoal} onChangeText={setWeeklyGoal} keyboardType="number-pad" />
        <Field label="Stappendoel per dag" value={stepGoal} onChangeText={setStepGoal} keyboardType="number-pad" />
        <Field label="Actieve calorieën per dag (doel)" value={calorieGoal} onChangeText={setCalorieGoal} keyboardType="number-pad" />
        <Text style={styles.units}>Eenheden: kilogram (kg), centimeters (cm), kilometers (km).</Text>
        <Button title="Profiel en doelen opslaan" onPress={saveProfile} style={styles.saveButton} />
      </Card>

      <SectionTitle title="Apple Gezondheid" />
      <Card>
        <View style={styles.statusHeader}>
          <View style={[styles.statusDot, healthHasMeasurements ? styles.connectedDot : styles.disconnectedDot]} />
          <Text style={styles.statusTitle}>{healthStatusLabel}</Text>
        </View>
        <Text style={styles.description}>{healthDescription}</Text>
        <View style={styles.permissionList}>
          {healthMetrics.map((metric) => {
            const hasValue = metric.value != null;
            const status = !healthState.nativeAvailable
              ? 'Niet beschikbaar in de webapp'
              : healthState.healthAvailable === false
                ? 'Niet beschikbaar'
                : hasValue
                  ? `Gegevens ontvangen${metric.unit ? ` · ${Number(metric.value).toLocaleString('nl-NL')} ${metric.unit}` : ''}`
                  : healthState.authorizationRequested
                    ? 'Geen gegevens ontvangen'
                    : 'Toestemming nog niet aangevraagd';
            return (
              <View key={metric.label} style={styles.permissionRow}>
                <Text style={styles.permissionName}>{metric.label}</Text>
                <Text style={[styles.permissionStatus, hasValue && styles.permissionReceived]}>{status}</Text>
              </View>
            );
          })}
        </View>
        {healthState.authorizationRequested ? (
          <Text style={styles.privacyNote}>
            Geen gegevens kan betekenen dat er nog geen metingen zijn óf dat Apple de leestoestemming niet heeft gegeven. iOS laat apps een geweigerde leesmachtiging niet herkennen. Controleer per gegevenstype de toegang voor FitTrack in de instellingen van Apple Gezondheid.
          </Text>
        ) : null}
        {healthState.error ? <Text style={styles.error}>{healthState.error}</Text> : null}
        <Button
          title={healthState.loading ? 'HealthKit wordt geladen…' : healthState.nativeAvailable ? 'Toestemming aanvragen / controleren' : 'HealthKit niet beschikbaar in de webapp'}
          disabled={healthState.loading || !healthState.nativeAvailable}
          onPress={onRequestHealthAccess}
        />
        {healthState.authorizationRequested ? (
          <Button
            title="Gegevens vernieuwen"
            secondary
            disabled={healthState.loading}
            onPress={onRefreshHealth}
            style={styles.refreshButton}
          />
        ) : null}
      </Card>

      <SectionTitle title="Gegevens beheren" />
      <Card>
        <Text style={styles.description}>Je trainingsgeschiedenis en oefeningen staan lokaal op dit apparaat.</Text>
        <Button title="Trainingsgeschiedenis wissen" secondary onPress={onClearWorkouts} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  units: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -4, marginBottom: 14 },
  saveButton: { marginTop: 2 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  disconnectedDot: { backgroundColor: colors.danger },
  connectedDot: { backgroundColor: colors.success },
  statusTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 12, lineHeight: 19, marginBottom: 14 },
  permissionList: { borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 14 },
  permissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  permissionName: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' },
  permissionStatus: { color: colors.muted, fontSize: 10, textAlign: 'right', flex: 1.2 },
  permissionReceived: { color: colors.success },
  privacyNote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginBottom: 12 },
  refreshButton: { marginTop: 10 },
  error: { color: colors.danger, fontSize: 11, lineHeight: 16, marginBottom: 12 },
});
