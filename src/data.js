import { sb } from './config.js';
import { state } from './state.js';

export async function loadAllData() {
  const [cr, ch, ex, qu, ec, cc] = await Promise.all([
    sb.from('courses').select('*').order('sort_order'),
    sb.from('chapters').select('*').order('sort_order'),
    sb.from('exercises').select('*').order('sort_order'),
    sb.from('questions').select('*').order('sort_order'),
    sb.from('exercise_content').select('*').order('sort_order'),
    sb.from('chapter_content').select('*').order('sort_order'),
  ]);
  if (cr.error) throw cr.error;
  if (ch.error) throw ch.error;
  if (ex.error) throw ex.error;
  if (qu.error) throw qu.error;
  // exercise_content / chapter_content may not exist yet — graceful fallback
  state.cacheData = {
    courses: cr.data || [],
    chapters: ch.data || [],
    exercises: ex.data || [],
    questions: qu.data || [],
    contentBlocks: (ec && !ec.error) ? (ec.data || []) : [],
    chapterContentBlocks: (cc && !cc.error) ? (cc.data || []) : [],
  };
}

export async function loadUserAnswers() {
  if (!state.currentUser) return;
  const { data, error } = await sb
    .from('answers')
    .select('question_id,answer_text,updated_at')
    .eq('user_id', state.currentUser.id);
  if (error) throw error;
  state.cacheAnswers = {};
  state.cacheAnswerDates = {};
  if (data) for (const r of data) {
    state.cacheAnswers[r.question_id] = r.answer_text || '';
    state.cacheAnswerDates[r.question_id] = r.updated_at || '';
  }
}

export async function loadAdminStatus() {
  if (!state.currentUser) return;
  const { data } = await sb
    .from('profiles')
    .select('is_admin')
    .eq('id', state.currentUser.id)
    .single();
  state.isAdmin = data?.is_admin || false;
}

export async function loadCourseAccess() {
  if (!state.currentUser) return;
  const { data } = await sb
    .from('course_access')
    .select('course_id, access_type, stripe_subscription_id, expires_at')
    .eq('user_id', state.currentUser.id);
  state.cacheAccessFull = data || [];
  state.cacheAccess = (data || []).map((r) => r.course_id);
}

export function canAccessCourse(course) {
  // Admin always has access
  if (state.isAdmin) return true;

  // Non-restricted, non-purchasable exercise courses: always accessible
  if (!course.restricted && !course.is_purchasable) return true;

  // Extension course: parent course must also be accessible
  if (course.parent_course_id) {
    const parent = state.cacheData.courses.find(c => c.id === course.parent_course_id);
    if (parent && !canAccessCourse(parent)) return false;
  }

  // Check if user has explicit access
  const access = (state.cacheAccessFull || []).find(a => a.course_id === course.id);
  if (!access) return false;

  // Check subscription expiry
  if (access.expires_at && new Date(access.expires_at) < new Date()) return false;

  return true;
}

// Helper: get extension courses for a parent course
export function getExtensionCourses(courseId) {
  return state.cacheData.courses.filter(c => c.parent_course_id === courseId);
}

// Check if user has an active subscription for a course
export function getCourseAccess(courseId) {
  return (state.cacheAccessFull || []).find(a => a.course_id === courseId) || null;
}

// Helper: get all questions for a chapter (through exercises)
export function getChapterQuestions(chapterId) {
  const exIds = state.cacheData.exercises
    .filter((ex) => ex.chapter_id === chapterId)
    .map((ex) => ex.id);
  return state.cacheData.questions.filter((q) => exIds.includes(q.exercise_id));
}

// Helper: get all questions for a course
export function getCourseQuestions(courseId) {
  const chIds = state.cacheData.chapters
    .filter((ch) => ch.course_id === courseId)
    .map((ch) => ch.id);
  const exIds = state.cacheData.exercises
    .filter((ex) => chIds.includes(ex.chapter_id))
    .map((ex) => ex.id);
  return state.cacheData.questions.filter((q) => exIds.includes(q.exercise_id));
}
