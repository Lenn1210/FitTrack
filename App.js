import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import FitTrackNative from './modules/fittrack-native/src';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { DEFAULT_EXERCISES } from './src/exercises';
import { colors } from './src/theme';
import { Card } from './src/components';

const STORAGE_KEY = '@fittrack/data-v1';

const INITIAL_DATA = {
  workouts: [],
  exercises: DEFAULT_EXERCISES,
  profile: { name: '', weeklyGoal: '3', stepGoal: '8000', calorieGoal: '400' },
};

const TABS = [
  { id: 'home', title: 'Home', icon: '⌂' },
  { id: 'calendar', title: 'Dagen', icon: '▦' },
  { id: 'workout', title: 'Training', icon: '+' },
  { id: 'progress', title: 'Voortgang', icon: '↗' },
  { id: 'profile', title: 'Profiel', icon: '◉' },
];

function FitTrackApp() {
  const [data, setData] = useState(INITIAL_DATA);
  const dataRef = useRef(INITIAL_DATA);
  const healthRequestRef = useRef(false);
  const healthSyncInFlightRef = useRef(false);
  const healthSyncQueuedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [healthState, setHealthState] = useState({
    nativeAvailable: Boolean(FitTrackNative),
    loading: false,
    healthAvailable: null,
    authorizationRequested: false,
    summary: null,
    error: '',
  });
  healthRequestRef.current = healthState.authorizationRequested;
  dataRef.current = data;

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed.workouts) || !Array.isArray(parsed.exercises) ||
            parsed.workouts.some((workout) => !Array.isArray(workout.exercises) || !workout.date || !workout.name)) {
            throw new Error('De opgeslagen trainingsgegevens hebben een ongeldig formaat.');
          }
          if (isMounted) {
            const loadedData = {
              ...INITIAL_DATA,
              ...parsed,
              profile: { ...INITIAL_DATA.profile, ...parsed.profile },
            };
            dataRef.current = loadedData;
            setData(loadedData);
          }
        }
      } catch (error) {
        if (isMounted) setStorageError(`Gegevens laden is niet gelukt: ${error.message}`);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          if (FitTrackNative) loadHealthStatus();
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  async function saveData(nextData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      dataRef.current = nextData;
      setData(nextData);
      setStorageError('');
      return true;
    } catch (error) {
      const message = `Opslaan is niet gelukt: ${error.message}`;
      setStorageError(message);
      Alert.alert('Opslaan mislukt', message);
      return false;
    }
  }

  async function saveWorkout(workout) {
    const currentData = dataRef.current;
    const newRecords = workout.exercises.filter((exercise) => {
      if (exercise.weightKg <= 0) return false;
      const previousBest = currentData.workouts.reduce((best, savedWorkout) => {
        const matching = savedWorkout.exercises.filter(
          (savedExercise) => savedExercise.name.toLowerCase() === exercise.name.toLowerCase(),
        );
        return Math.max(best, ...matching.map((savedExercise) => savedExercise.weightKg));
      }, 0);
      return exercise.weightKg > previousBest;
    });
    const saved = await saveData({
      ...currentData,
      workouts: [{ ...workout, id: `${Date.now()}`, date: new Date().toISOString() }, ...currentData.workouts],
    });

    if (saved) {
      Alert.alert(
        newRecords.length ? 'Nieuw persoonlijk record!' : 'Training opgeslagen',
        newRecords.length
          ? `Sterk! Je tilde meer bij ${newRecords.map((exercise) => exercise.name).join(', ')}.`
          : 'Je training staat in je geschiedenis.',
      );
      setActiveTab('calendar');
    }
  }

  async function updateExerciseLibrary(exercises) {
    return saveData({ ...data, exercises });
  }

  async function updateProfile(profile) {
    return saveData({ ...data, profile });
  }

  async function refreshHealthData() {
    if (!FitTrackNative) {
      setHealthState((current) => ({
        ...current,
        error: 'De native HealthKit-module ontbreekt. Maak op een Mac een nieuwe iOS-build met `npx expo prebuild --platform ios` en Xcode.',
      }));
      return;
    }

    if (healthSyncInFlightRef.current) {
      healthSyncQueuedRef.current = true;
      return;
    }

    healthSyncInFlightRef.current = true;
    setHealthState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const healthAvailable = await FitTrackNative.isHealthDataAvailable();
      if (!healthAvailable) {
        setHealthState((current) => ({
          ...current,
          loading: false,
          healthAvailable: false,
          summary: null,
          error: '',
        }));
        return;
      }

      const [summary, healthWorkouts] = await Promise.all([
        FitTrackNative.getTodaySummary(),
        FitTrackNative.getWorkoutsSince(Date.UTC(2000, 0, 1)),
      ]);
      const currentData = dataRef.current;
      const syncedWorkouts = healthWorkouts.map((workout) => ({
        id: `healthkit-${workout.id}`,
        healthKitId: workout.id,
        source: 'healthkit',
        name: workout.activityType,
        date: workout.startDate,
        durationMinutes: Math.round(workout.durationMinutes),
        activeCalories: workout.activeCalories,
        notes: 'Geïmporteerd uit Apple Gezondheid.',
        exercises: [],
      }));

      const syncedHealthWorkoutIds = new Set(syncedWorkouts.map((workout) => workout.healthKitId));
      const seenLocalHealthWorkoutIds = new Set();
      const retainedWorkouts = currentData.workouts.filter((workout) => {
        if (workout.source !== 'healthkit' && !workout.healthKitId) return true;
        const healthKitId = workout.healthKitId || workout.id.replace(/^healthkit-/, '');
        if (syncedHealthWorkoutIds.has(healthKitId) || seenLocalHealthWorkoutIds.has(healthKitId)) return false;
        seenLocalHealthWorkoutIds.add(healthKitId);
        return true;
      });
      const mergedWorkouts = [...syncedWorkouts, ...retainedWorkouts].sort(
        (left, right) => new Date(right.date) - new Date(left.date),
      );
      if (JSON.stringify(mergedWorkouts) !== JSON.stringify(currentData.workouts)) {
        const saved = await saveData({ ...currentData, workouts: mergedWorkouts });
        if (!saved) throw new Error('Gesynchroniseerde trainingen konden niet lokaal worden opgeslagen.');
      }

      setHealthState((current) => ({
        ...current,
        loading: false,
        healthAvailable,
        authorizationRequested: summary.authorizationRequested,
        summary,
        error: '',
      }));
    } catch (error) {
      setHealthState((current) => ({
        ...current,
        loading: false,
        error: `Gezondheidsgegevens ophalen is niet gelukt: ${error.message}`,
      }));
    } finally {
      healthSyncInFlightRef.current = false;
      if (healthSyncQueuedRef.current) {
        healthSyncQueuedRef.current = false;
        void refreshHealthData();
      }
    }
  }

  async function loadHealthStatus() {
    if (!FitTrackNative) return;
    try {
      const healthAvailable = await FitTrackNative.isHealthDataAvailable();
      if (!healthAvailable) {
        setHealthState((current) => ({ ...current, healthAvailable: false }));
        return;
      }

      const summary = await FitTrackNative.getTodaySummary();
      setHealthState((current) => ({
        ...current,
        healthAvailable: true,
        authorizationRequested: summary.authorizationRequested,
        summary,
      }));
      if (summary.authorizationRequested) await refreshHealthData();
    } catch (error) {
      setHealthState((current) => ({
        ...current,
        error: `HealthKit-status ophalen is niet gelukt: ${error.message}`,
      }));
    }
  }

  async function requestHealthAccess() {
    if (!FitTrackNative) {
      await refreshHealthData();
      return;
    }

    setHealthState((current) => ({ ...current, loading: true, error: '' }));
    try {
      await FitTrackNative.requestHealthAccess();
      const summary = await FitTrackNative.getTodaySummary();
      setHealthState((current) => ({
        ...current,
        authorizationRequested: summary.authorizationRequested,
        summary,
        healthAvailable: summary.available,
      }));
      await refreshHealthData();
    } catch (error) {
      setHealthState((current) => ({
        ...current,
        loading: false,
        error: `Toestemming aanvragen is niet gelukt: ${error.message}`,
      }));
    }
  }

  useEffect(() => {
    if (!FitTrackNative) return undefined;

    let active = true;
    const healthListener = FitTrackNative.addListener('onHealthDataChanged', (event) => {
      if (event.error) {
        setHealthState((current) => ({
          ...current,
          error: `HealthKit-update (${event.type}) is niet gelukt: ${event.error}`,
        }));
        return;
      }
      if (active) refreshHealthData();
    });
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (active && state === 'active' && healthRequestRef.current) refreshHealthData();
    });

    return () => {
      active = false;
      healthListener.remove();
      appStateListener.remove();
    };
  }, []);

  async function clearWorkouts() {
    Alert.alert('Trainingsgeschiedenis wissen?', 'Dit verwijdert al je opgeslagen trainingen. Dit kan niet ongedaan worden gemaakt.', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Wissen',
        style: 'destructive',
        onPress: () => saveData({ ...data, workouts: [] }),
      },
    ]);
  }

  const screenProps = {
    data,
    onSaveWorkout: saveWorkout,
    onSaveExercises: updateExerciseLibrary,
    onSaveProfile: updateProfile,
    onClearWorkouts: clearWorkouts,
    onNavigate: setActiveTab,
    healthState,
    onRequestHealthAccess: requestHealthAccess,
    onRefreshHealth: refreshHealthData,
  };

  let screen;
  switch (activeTab) {
    case 'calendar':
      screen = <CalendarScreen {...screenProps} />;
      break;
    case 'workout':
      screen = <WorkoutScreen {...screenProps} />;
      break;
    case 'progress':
      screen = <ProgressScreen {...screenProps} />;
      break;
    case 'profile':
      screen = <ProfileScreen {...screenProps} />;
      break;
    default:
      screen = <HomeScreen {...screenProps} />;
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.loading}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>FitTrack wordt geladen...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.app}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {storageError ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{storageError}</Text>
        </Card>
      ) : null}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} keyboardShouldPersistTaps="handled">
        {screen}
      </ScrollView>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={styles.tab}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabIcon, isActive && styles.activeTabText]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.activeTabText]}>{tab.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={styles.app}>
      <FitTrackApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.muted, marginTop: 14 },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9,
    paddingBottom: 18,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { color: colors.muted, fontSize: 22, height: 25 },
  tabLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  activeTabText: { color: colors.accent },
  errorCard: { marginHorizontal: 16, marginTop: 8, paddingVertical: 10 },
  errorText: { color: colors.danger, fontSize: 12 },
});
