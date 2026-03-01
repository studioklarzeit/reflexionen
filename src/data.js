import { sb } from './config.js';
import { state } from './state.js';

// Core data: loaded at login (5 parallel queries)
export async function loadCoreData() {
  const [cr, ch, ex, qu, md, pl] = await Promise.all([
    sb.from('courses').select('*').order('sort_order'),
    sb.from('chapters').select('*').order('sort_order'),
    sb.from('exercises').select('*').order('sort_order'),
    sb.from('questions').select('*').order('sort_order'),
    sb.from('meditations').select('*').eq('is_active', true).order('sort_order'),
    sb.from('color_palettes').select('*').order('name'),
  ]);
  // Log errors but don't throw — partial data is better than no data
  if (cr.error) console.error('courses query error:', cr.error.message);
  if (ch.error) console.error('chapters query error:', ch.error.message);
  if (ex.error) console.error('exercises query error:', ex.error.message);
  if (qu.error) console.error('questions query error:', qu.error.message);
  state.cacheData = {
    courses: cr.data || [],
    chapters: ch.data || [],
    exercises: ex.data || [],
    questions: qu.data || [],
    meditations: (md && !md.error) ? (md.data || []) : [],
    palettes: (pl && !pl.error) ? (pl.data || []) : [],
    contentBlocks: [],
    chapterContentBlocks: [],
  };
}

// Content data: loaded on-demand when exercises/chapters are opened
let _contentLoaded = false;

export async function ensureContentData() {
  if (_contentLoaded) return;
  const [ec, cc] = await Promise.all([
    sb.from('exercise_content').select('*').order('sort_order'),
    sb.from('chapter_content').select('*').order('sort_order'),
  ]);
  state.cacheData.contentBlocks = (ec && !ec.error) ? (ec.data || []) : [];
  state.cacheData.chapterContentBlocks = (cc && !cc.error) ? (cc.data || []) : [];
  _contentLoaded = true;
}

export function resetLazyFlags() {
  _contentLoaded = false;
}

// Legacy alias for backwards compatibility
export async function loadAllData() {
  await loadCoreData();
}

export async function loadToolImages() {
  try {
    const { data } = await sb.from('settings').select('value').eq('key', 'tool_images').single();
    state.toolImages = data?.value ? JSON.parse(data.value) : {};
  } catch (_) { state.toolImages = {}; }
}

export async function loadChapterProgress() {
  if (!state.currentUser) return;
  try {
    const { data, error } = await sb
      .from('chapter_progress')
      .select('*')
      .eq('user_id', state.currentUser.id);
    if (error) console.warn('loadChapterProgress error:', error.message);
    state.chapterProgress = {};
    (data || []).forEach(p => { state.chapterProgress[p.chapter_id] = p; });
  } catch (e) {
    console.error('loadChapterProgress exception:', e);
    state.chapterProgress = {};
  }
}

export async function loadUserAnswers() {
  if (!state.currentUser) return;
  try {
    const { data, error } = await sb
      .from('answers')
      .select('question_id,answer_text,updated_at')
      .eq('user_id', state.currentUser.id);
    if (error) console.warn('loadUserAnswers error:', error.message);
    state.cacheAnswers = {};
    state.cacheAnswerDates = {};
    if (data) for (const r of data) {
      state.cacheAnswers[r.question_id] = r.answer_text || '';
      state.cacheAnswerDates[r.question_id] = r.updated_at || '';
    }
  } catch (e) {
    console.error('loadUserAnswers exception:', e);
    state.cacheAnswers = {};
    state.cacheAnswerDates = {};
  }
}

export async function loadAdminStatus() {
  if (!state.currentUser) { state.isAdmin = false; return; }
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('is_admin')
      .eq('id', state.currentUser.id)
      .single();
    if (error) { console.warn('loadAdminStatus error:', error.message); }
    state.isAdmin = data?.is_admin || false;
  } catch (e) {
    console.error('loadAdminStatus exception:', e);
    state.isAdmin = false;
  }
}

export async function loadCourseAccess() {
  if (!state.currentUser) return;
  try {
    const { data, error } = await sb
      .from('course_access')
      .select('course_id, access_type, stripe_subscription_id, expires_at')
      .eq('user_id', state.currentUser.id);
    if (error) console.warn('loadCourseAccess error:', error.message);
    state.cacheAccessFull = data || [];
    state.cacheAccess = (data || []).map((r) => r.course_id);
  } catch (e) {
    console.error('loadCourseAccess exception:', e);
    state.cacheAccessFull = [];
    state.cacheAccess = [];
  }
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
