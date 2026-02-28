// ── Shared mutable application state ──

export const state = {
  currentUser: null,
  currentView: 'auth',
  currentCourseId: null,
  currentChapterId: null,
  currentExerciseId: null,
  saveTimeout: null,
  isAdmin: false,
  cacheData: { courses: [], chapters: [], exercises: [], questions: [] },
  cacheAnswers: {},   // keyed by question_id
  cacheAnswerDates: {}, // keyed by question_id → updated_at ISO string
  cacheAccess: [],
  cacheAccessFull: [],
  chapterProgress: {},  // keyed by chapter_id
  pendingInvite: null,
  pendingStripeSuccess: null,
};
