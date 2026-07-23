import { supabase, APP_CONFIG } from './config.js';

export async function checkSessionExpiry() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const lastSignInAt = new Date(session.user.last_sign_in_at).getTime();
    const now = new Date().getTime();
    const thirtyDaysMs = APP_CONFIG.sessionExpiryDays * 24 * 60 * 60 * 1000;

    if (now - lastSignInAt > thirtyDaysMs) {
      await supabase.auth.signOut();
      return false;
    }
    return true;
  }
  return false;
}

export async function loginWithEmail(email, password) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  return await supabase.auth.signUp({ email, password });
}

export async function loginWithGoogle() {
  return await supabase.auth.signInWithOAuth({ provider: 'google' });
}

export async function loginWithMagicLink(email) {
  return await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true
    }
  });
}

export async function verifyOtp(email, token) {
  return await supabase.auth.verifyOtp({
    email,
    token,
    type: 'magiclink'
  });
}

export async function checkUsernameAvailable(username) {
  if (!username) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();

  if (error && error.code === 'PGRST116') {
    return true; // No rows returned, username is available
  }
  return false; // Username is taken
}

export async function createProfile(userId, fullName, username, profession) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ id: userId, full_name: fullName, username, profession }])
    .select();
  return { data, error };
}

export async function logout() {
  return await supabase.auth.signOut();
}
