import { supabase, supabaseUrl, supabasePublicKey } from './supabase';
import { validateRecipe } from '../models/recipes';

export async function generateRecipes({
  servings = 2,
  preference = '',
  action = 'recommend',
  query = '',
  message = '',
  requestId,
  useInventory = false,
  recipeId,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    let {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (session && session.expires_at <= Date.now() / 1000 + 60) {
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.error) throw refreshed.error;
      session = refreshed.data.session;
    }
    if (!session) throw new Error('Bạn cần đăng nhập lại để sử dụng AI.');
    // The pinned Functions SDK ignores AbortSignal. Use fetch so timeout really aborts.
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chef`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: supabasePublicKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        servings,
        preference,
        action,
        query,
        message,
        requestId,
        useInventory,
        recipeId,
      }),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Máy chủ AI trả về phản hồi không hợp lệ.');
    }
    if (!response.ok)
      throw new Error(
        response.status === 404 && data?.code === 'NOT_FOUND'
          ? 'Dịch vụ Gemini và danh mục món ăn chưa được triển khai trên máy chủ.'
          : data?.error || 'Chưa kết nối được AI. Vui lòng thử lại.',
      );
    if (action === 'catalog') return data;
    if (action === 'chat') {
      if (typeof data?.message !== 'string' || !data.message.trim())
        throw new Error('AI chưa trả lời. Hãy thử lại.');
      return data.message;
    }
    if (!Array.isArray(data?.recipes) || data.recipes.length > 3)
      throw new Error('AI chưa trả về công thức hợp lệ. Thử lại hoặc dùng công thức có sẵn.');
    return data.recipes.map(validateRecipe);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('AI phản hồi quá lâu. Vui lòng thử lại.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
