export class GetChallenge {
  #db;
  #prefs;
  #bus;
  #events;
  #getActiveProfileId;
  #today;
  #daysBetween;
  #getProfileRecords;
  #exerciseRepo;
  #achievementGateway;

  constructor({
    db,
    prefs,
    bus,
    events,
    getActiveProfileId,
    today,
    daysBetween,
    getProfileRecords,
    exerciseRepo,
    achievementGateway = null
  }) {
    this.#db = db;
    this.#prefs = prefs;
    this.#bus = bus;
    this.#events = events;
    this.#getActiveProfileId = getActiveProfileId;
    this.#today = today;
    this.#daysBetween = daysBetween;
    this.#getProfileRecords = getProfileRecords;
    this.#exerciseRepo = exerciseRepo;
    this.#achievementGateway = achievementGateway;
  }

  getState(challengeData) {
    const currentDay = this.getCurrentDay();
    const completedDays = this.getCompletedDays();
    const totalDays = challengeData?.days?.length || 0;
    const progress = totalDays ? Math.round((completedDays.length / totalDays) * 100) : 0;

    return {
      currentDay,
      completedDays,
      activeDay: this.#prefs.get(this.#activeDayKey()),
      progress,
      remainingDays: Math.max(totalDays - completedDays.length, 0)
    };
  }

  async getViewModel(challengeData, selectedDay = null) {
    const state = this.getState(challengeData);
    const activeSelectedDay = selectedDay ?? state.currentDay;
    return {
      ...state,
      selectedDay: activeSelectedDay,
      selected: challengeData.days.find((day) => day.day === activeSelectedDay) || challengeData.days[0],
      monthlyChallenges: await this.getMonthlyChallengeModels()
    };
  }

  getCurrentDay() {
    const start = this.#prefs.get(this.#startDateKey());
    if (!start) {
      const startDate = this.#today();
      this.#prefs.set(this.#startDateKey(), startDate);
      return 1;
    }
    return Math.max(1, Math.min(30, this.#daysBetween(start, this.#today()) + 1));
  }

  getCompletedDays() {
    return this.#prefs.get(this.#completedDaysKey(), []);
  }

  startDay(dayNumber) {
    this.#prefs.set(this.#activeDayKey(), dayNumber);
    return dayNumber;
  }

  markCompletedDay(dayNumber) {
    const completed = new Set(this.getCompletedDays());
    completed.add(dayNumber);
    const completedDays = [...completed].sort((a, b) => a - b);
    this.#prefs.set(this.#completedDaysKey(), completedDays);
    this.#bus.emit(this.#events.HABIT_COMPLETED, { type: 'challenge', day: dayNumber });
    return completedDays;
  }

  completeActiveDay() {
    const activeDay = this.#prefs.get(this.#activeDayKey());
    if (!activeDay) return null;
    const completedDays = this.markCompletedDay(activeDay);
    this.#prefs.remove(this.#activeDayKey());
    return { activeDay, completedDays };
  }

  buildWorkoutPlan(challengeData, dayNumber, user) {
    const day = challengeData.days.find((entry) => entry.day === dayNumber);
    if (!day || day.type !== 'workout') return null;
    this.startDay(dayNumber);
    return {
      id: `challenge-day-${day.day}`,
      name: `${challengeData.name} • Day ${day.day}`,
      category: 'challenge',
      difficulty: user.level,
      duration: day.exercises.length * 3,
      warmUp: [],
      main: day.exercises,
      coolDown: [],
      restBetweenSets: 20,
      restBetweenExercises: 25
    };
  }

  async getMonthlyChallengeModels() {
    const month = new Date().toISOString().slice(0, 7);
    const profileId = this.#getActiveProfileId();
    const sessions = (await this.#getProfileRecords(this.#db, 'sessions', profileId))
      .filter((session) => String(session.date || session.completedAt).startsWith(month));
    const workoutDays = new Set(sessions.map((session) => session.date));
    const exerciseDetails = sessions.flatMap((session) => session.exerciseDetails || []);
    const yogaCatalog = this.#exerciseRepo.getByTag('yoga');
    const yogaDone = new Set(exerciseDetails.filter((detail) => this.#exerciseRepo.getById(detail.exerciseId)?.tags.includes('yoga')).map((detail) => detail.exerciseId));
    const plankDays = new Set(sessions.filter((session) => (session.exerciseIds || []).some((id) => id.includes('plank'))).map((session) => session.date));
    const squatTotal = exerciseDetails.filter((detail) => String(detail.exerciseId).includes('squat')).reduce((sum, detail) => sum + ((detail.target || 0) * (detail.sets || 1)), 0);
    const dayOfMonth = new Date().getDate();
    const missedDays = Math.max(0, dayOfMonth - workoutDays.size);

    const definitions = [
      { id: 'monthly-plank-month', title: 'Plank Month', desc: 'Hold plank every day and keep stacking time.', icon: '🧱', rewardXp: 120, progress: Math.min(100, Math.round((plankDays.size / Math.max(dayOfMonth, 1)) * 100)), label: `${plankDays.size}/${dayOfMonth} days with plank`, completed: dayOfMonth >= 28 && plankDays.size >= Math.max(dayOfMonth - 2, 1) },
      { id: 'monthly-1000-squats', title: '1000 Squats', desc: 'Accumulate 1000 squats in 30 days.', icon: '🦵', rewardXp: 150, progress: Math.min(100, Math.round((squatTotal / 1000) * 100)), label: `${squatTotal}/1000 squats`, completed: squatTotal >= 1000 },
      { id: 'monthly-yoga-journey', title: 'Yoga Journey', desc: 'Try every yoga pose in the catalog.', icon: '🧘', rewardXp: 140, progress: Math.min(100, Math.round((yogaDone.size / Math.max(yogaCatalog.length, 1)) * 100)), label: `${yogaDone.size}/${Math.max(yogaCatalog.length, 1)} poses completed`, completed: yogaCatalog.length > 0 && yogaDone.size >= yogaCatalog.length },
      { id: 'monthly-consistency-king', title: 'Consistency King', desc: 'Do not miss more than 2 days this month.', icon: '👑', rewardXp: 160, progress: Math.max(0, Math.min(100, Math.round(((Math.max(dayOfMonth - missedDays, 0)) / Math.max(dayOfMonth, 1)) * 100))), label: `${missedDays} miss${missedDays === 1 ? '' : 'es'} so far`, completed: dayOfMonth >= 28 && missedDays <= 2 }
    ];

    for (const definition of definitions.filter((item) => item.completed)) {
      const recordId = `${profileId}:${month}:${definition.id}`;
      const existing = await this.#db.get('monthlyChallenges', recordId);
      if (!existing) {
        await this.#db.put('monthlyChallenges', { id: recordId, profileId, month, challengeId: definition.id, completedAt: new Date().toISOString() });
        if (this.#achievementGateway?.grantBadge) {
          await this.#achievementGateway.grantBadge(profileId, {
            id: definition.id,
            title: definition.title,
            desc: `Monthly challenge complete: ${definition.desc}`,
            icon: definition.icon,
            xp: definition.rewardXp,
            type: 'monthly'
          });
        }
        this.#bus.emit(this.#events.MONTHLY_CHALLENGE_COMPLETED, definition);
      }
    }

    return definitions;
  }

  #startDateKey() {
    return `challengeStartDate_${this.#getActiveProfileId()}`;
  }

  #completedDaysKey() {
    return `challengeCompletedDays_${this.#getActiveProfileId()}`;
  }

  #activeDayKey() {
    return `activeChallengeDay_${this.#getActiveProfileId()}`;
  }
}
