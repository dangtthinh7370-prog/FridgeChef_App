import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';
import { validateRecipe } from '../models/recipes';
import { useAuth } from './AuthProvider';
const Context = createContext(null);
export function RecipeProvider({ children }) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]),
    [favorites, setFavorites] = useState([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [working, setWorking] = useState(false);
  const active = useRef(true),
    version = useRef(0),
    writing = useRef(false);
  const reload = useCallback(async () => {
    const request = ++version.current;
    try {
      const results = await Promise.all([
        supabase
          .from('recipe_catalog')
          .select('id,recipe')
          .order('fetched_at', { ascending: false })
          .limit(100),
        supabase
          .from('recipe_suggestions')
          .select('recipe_id,recipe,reason,suggested_at')
          .eq('user_id', user.id)
          .order('suggested_at', { ascending: false })
          .limit(100),
        supabase.from('recipe_favorites').select('recipe_id').eq('user_id', user.id),
      ]);
      for (const result of results) if (result.error) throw result.error;
      const map = new Map(results[0].data.map((row) => [row.id, validateRecipe(row.recipe)]));
      for (const row of results[1].data)
        map.set(row.recipe_id, {
          ...validateRecipe(row.recipe),
          reason: row.reason,
          suggestedAt: row.suggested_at,
        });
      const ids = results[2].data.map((row) => row.recipe_id);
      const absent = ids.filter((id) => !map.has(id));
      if (absent.length) {
        const extra = await supabase.from('recipe_catalog').select('id,recipe').in('id', absent);
        if (extra.error) throw extra.error;
        for (const row of extra.data) map.set(row.id, validateRecipe(row.recipe));
      }
      if (active.current && request === version.current) {
        setRecipes([...map.values()]);
        setFavorites(ids);
        setReady(true);
        setError('');
      }
    } catch (err) {
      if (active.current && request === version.current) {
        setError('Chưa tải được công thức từ Supabase. ' + err.message);
        setReady(false);
      }
      throw err;
    }
  }, [user.id]);
  useEffect(() => {
    active.current = true;
    reload().catch(() => {});
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') reload().catch(() => {});
    });
    const channel = supabase
      .channel(`recipes-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipe_favorites' }, () =>
        reload().catch(() => {}),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipe_suggestions',
          filter: `user_id=eq.${user.id}`,
        },
        () => reload().catch(() => {}),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipe_catalog' }, () =>
        reload().catch(() => {}),
      )
      .subscribe();
    return () => {
      active.current = false;
      version.current++;
      app.remove();
      supabase.removeChannel(channel);
    };
  }, [reload, user.id]);
  const toggleFavorite = async (id) => {
    if (writing.current) return;
    writing.current = true;
    setWorking(true);
    try {
      const result = favorites.includes(id)
        ? await supabase
            .from('recipe_favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('recipe_id', id)
        : await supabase.from('recipe_favorites').insert({ user_id: user.id, recipe_id: id });
      if (result.error) throw result.error;
      await reload();
    } finally {
      writing.current = false;
      if (active.current) setWorking(false);
    }
  };
  return (
    <Context.Provider value={{ recipes, favorites, ready, error, working, reload, toggleFavorite }}>
      {children}
    </Context.Provider>
  );
}
export const useRecipes = () => useContext(Context);
