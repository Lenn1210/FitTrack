export type HealthKitWorkout = {
  id: string;
  activityType: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  activeCalories: number | null;
};

export type HealthKitSummary = {
  available: boolean;
  authorizationRequested: boolean;
  activeCalories: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  heartRateBpm: number | null;
  workoutCount: number | null;
  asOf: string;
};

export type HealthDataChangedEvent = {
  type: string;
  error?: string;
};

declare const FitTrackNative: {
  isHealthDataAvailable(): Promise<boolean>;
  requestHealthAccess(): Promise<{ requestProcessed: boolean }>;
  getTodaySummary(): Promise<HealthKitSummary>;
  getWorkoutsSince(startDate: number): Promise<HealthKitWorkout[]>;
  addListener(
    eventName: 'onHealthDataChanged',
    listener: (event: HealthDataChangedEvent) => void,
  ): { remove(): void };
} | null;

export default FitTrackNative;
