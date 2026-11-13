import ExpoModulesCore
import HealthKit

public final class FitTrackNativeModule: Module {
  private let healthStore = HKHealthStore()
  private let healthRequestKey = "fittrack.health.authorization-requested"
  private var observerQueries: [HKObserverQuery] = []

  public func definition() -> ModuleDefinition {
    Name("FitTrackNative")

    Events("onHealthDataChanged")

    OnCreate {
      if UserDefaults.standard.bool(forKey: self.healthRequestKey) {
        self.startObservingHealthData()
      }
    }

    AsyncFunction("isHealthDataAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestHealthAccess") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject("E_HEALTH_UNAVAILABLE", "Apple Gezondheid is niet beschikbaar op dit apparaat.")
        return
      }

      guard let readTypes = self.healthReadTypes() else {
        promise.reject("E_HEALTH_TYPES", "De vereiste HealthKit-gegevens zijn niet beschikbaar.")
        return
      }

      self.healthStore.requestAuthorization(toShare: Set<HKSampleType>(), read: readTypes) { success, error in
        if let error {
          promise.reject(error)
          return
        }

        UserDefaults.standard.set(true, forKey: self.healthRequestKey)
        DispatchQueue.main.async {
          self.startObservingHealthData()
          promise.resolve(["requestProcessed": success])
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("getTodaySummary") { (promise: Promise) in
      Task {
        do {
          promise.resolve(try await self.todaySummary())
        } catch {
          promise.reject(error)
        }
      }
    }

    AsyncFunction("getWorkoutsSince") { (startDate: Double, promise: Promise) in
      let start = Date(timeIntervalSince1970: startDate / 1000)
      self.queryWorkouts(since: start) { result in
        switch result {
        case .success(let workouts):
          promise.resolve(workouts)
        case .failure(let error):
          promise.reject(error)
        }
      }
    }
  }

  private func healthReadTypes() -> Set<HKObjectType>? {
    let identifiers: [HKQuantityTypeIdentifier] = [
      .activeEnergyBurned,
      .stepCount,
      .appleExerciseTime,
      .heartRate,
    ]
    var types = Set<HKObjectType>()

    for identifier in identifiers {
      guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
        return nil
      }
      types.insert(type)
    }
    types.insert(HKObjectType.workoutType())
    return types
  }

  private func startObservingHealthData() {
    guard observerQueries.isEmpty, let readTypes = healthReadTypes() else {
      return
    }

    for objectType in readTypes {
      guard let sampleType = objectType as? HKSampleType else {
        continue
      }

      let observer = HKObserverQuery(sampleType: sampleType, predicate: nil) { [weak self] _, completion, error in
        if let error {
          self?.sendEvent("onHealthDataChanged", [
            "type": sampleType.identifier,
            "error": error.localizedDescription,
          ])
          completion()
          return
        }

        self?.sendEvent("onHealthDataChanged", ["type": sampleType.identifier])
        completion()
      }

      observerQueries.append(observer)
      healthStore.execute(observer)
      healthStore.enableBackgroundDelivery(for: sampleType, frequency: .hourly) { [weak self] _, error in
        guard let error else {
          return
        }
        self?.sendEvent("onHealthDataChanged", [
          "type": sampleType.identifier,
          "error": error.localizedDescription,
        ])
      }
    }
  }

  private func todaySummary() async throws -> [String: Any] {
    guard HKHealthStore.isHealthDataAvailable() else {
      throw NativeHealthError.unavailable
    }

    let now = Date()
    let startOfDay = Calendar.current.startOfDay(for: now)
    let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)

    async let activeCalories = sum(.activeEnergyBurned, unit: .kilocalorie(), predicate: predicate)
    async let steps = sum(.stepCount, unit: .count(), predicate: predicate)
    async let exerciseMinutes = sum(.appleExerciseTime, unit: .minute(), predicate: predicate)
    async let heartRate = latestHeartRate(predicate: predicate)
    async let workoutCount = countWorkouts(since: startOfDay)

    return [
      "available": true,
      "authorizationRequested": UserDefaults.standard.bool(forKey: healthRequestKey),
      "activeCalories": nullable(try await activeCalories),
      "steps": nullable(try await steps),
      "exerciseMinutes": nullable(try await exerciseMinutes),
      "heartRateBpm": nullable(try await heartRate),
      "workoutCount": nullable(try await workoutCount),
      "asOf": ISO8601DateFormatter().string(from: now),
    ]
  }

  private func sum(
    _ identifier: HKQuantityTypeIdentifier,
    unit: HKUnit,
    predicate: NSPredicate
  ) async throws -> Double? {
    guard let quantityType = HKObjectType.quantityType(forIdentifier: identifier) else {
      throw NativeHealthError.missingQuantityType
    }

    return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Double?, Error>) in
      let query = HKStatisticsQuery(
        quantityType: quantityType,
        quantitySamplePredicate: predicate,
        options: .cumulativeSum
      ) { _, statistics, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        continuation.resume(returning: statistics?.sumQuantity()?.doubleValue(for: unit))
      }
      self.healthStore.execute(query)
    }
  }

  private func latestHeartRate(predicate: NSPredicate) async throws -> Double? {
    guard let quantityType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
      throw NativeHealthError.missingQuantityType
    }

    return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Double?, Error>) in
      let query = HKSampleQuery(
        sampleType: quantityType,
        predicate: predicate,
        limit: 1,
        sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
      ) { _, samples, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }

        let unit = HKUnit.count().unitDivided(by: .minute())
        let sample = samples?.first as? HKQuantitySample
        continuation.resume(returning: sample?.quantity.doubleValue(for: unit))
      }
      self.healthStore.execute(query)
    }
  }

  private func queryWorkouts(
    since startDate: Date,
    completion: @escaping (Result<[[String: Any]], Error>) -> Void
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      completion(.failure(NativeHealthError.unavailable))
      return
    }

    let predicate = HKQuery.predicateForSamples(withStart: startDate, end: Date(), options: .strictStartDate)
    let query = HKSampleQuery(
      sampleType: HKObjectType.workoutType(),
      predicate: predicate,
      limit: HKObjectQueryNoLimit,
      sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
    ) { _, samples, error in
      if let error {
        completion(.failure(error))
        return
      }

      let workouts = (samples as? [HKWorkout] ?? []).map { workout -> [String: Any] in
        [
          "id": workout.uuid.uuidString,
          "activityType": self.activityName(workout.workoutActivityType),
          "startDate": ISO8601DateFormatter().string(from: workout.startDate),
          "endDate": ISO8601DateFormatter().string(from: workout.endDate),
          "durationMinutes": workout.duration / 60,
          "activeCalories": self.nullable(workout.totalEnergyBurned?.doubleValue(for: .kilocalorie())),
        ]
      }
      completion(.success(workouts))
    }
    healthStore.execute(query)
  }

  private func countWorkouts(since startDate: Date) async throws -> Double? {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Double?, Error>) in
      let predicate = HKQuery.predicateForSamples(withStart: startDate, end: Date(), options: .strictStartDate)
      let query = HKSampleQuery(
        sampleType: HKObjectType.workoutType(),
        predicate: predicate,
        limit: HKObjectQueryNoLimit,
        sortDescriptors: nil
      ) { _, samples, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }
        guard let samples, !samples.isEmpty else {
          continuation.resume(returning: nil)
          return
        }
        continuation.resume(returning: Double(samples.count))
      }
      self.healthStore.execute(query)
    }
  }

  private func nullable(_ value: Double?) -> Any {
    guard let value else {
      return NSNull()
    }
    return value
  }

  private func activityName(_ type: HKWorkoutActivityType) -> String {
    switch type {
    case .running: return "Hardlopen"
    case .walking: return "Wandelen"
    case .cycling: return "Fietsen"
    case .traditionalStrengthTraining: return "Krachttraining"
    case .functionalStrengthTraining: return "Functionele krachttraining"
    case .swimming: return "Zwemmen"
    case .yoga: return "Yoga"
    case .hiking: return "Wandelen"
    default: return "Apple Gezondheid-training"
    }
  }
}

private enum NativeHealthError: LocalizedError {
  case unavailable
  case missingQuantityType

  var errorDescription: String? {
    switch self {
    case .unavailable:
      return "HealthKit is niet beschikbaar op dit apparaat."
    case .missingQuantityType:
      return "Een gevraagd HealthKit-gegevenstype wordt niet ondersteund."
    }
  }
}
