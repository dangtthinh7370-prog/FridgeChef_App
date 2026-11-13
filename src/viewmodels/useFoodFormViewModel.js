import { useMemo, useRef, useState } from 'react';
import { useFridgeViewModel } from './FridgeProvider';
import { validateFood } from '../models/food';
import { createFoodForm, getFoodFormErrors, stepQuantity, QUICK_FOODS } from '../models/foodForm';

export default function useFoodFormViewModel(foodId) {
  const { foods, mutate, busy } = useFridgeViewModel();
  const existing = foods.find(food => String(food.id) === String(foodId));
  const editing = foodId != null;
  const missing = editing && !existing;
  const [form, setForm] = useState(() => createFoodForm(existing));
  const initial = useRef(JSON.stringify(form));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const saving = useRef(false);
  const suggestions = useMemo(() => {
    const result = [];
    const seen = new Set();
    const recent = [...foods].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const item of [...recent, ...QUICK_FOODS]) {
      const key = item.name.trim().toLocaleLowerCase('vi');
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ name: item.name, unit: item.unit, category: item.category || 'other' });
      }
      if (result.length === 6) break;
    }
    return result;
  }, [foods]);
  const setField = (key, value) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setError('');
  };
  const chooseSuggestion = item => {
    setForm(previous => ({ ...previous, name: item.name, unit: item.unit, category: item.category }));
    setErrors({});
    setError('');
  };
  const changeQuantity = direction => {
    setForm(previous => ({ ...previous, quantity: stepQuantity(previous.quantity, direction) }));
    setErrors(previous => ({ ...previous, quantity: undefined }));
    setError('');
  };
  const save = async ({ keepAdding = false } = {}) => {
    if (saving.current || busy) return null;
    saving.current = true;
    try {
      if (missing) throw new Error('Thực phẩm này đã bị xóa.');
      const problems = getFoodFormErrors(form);
      setErrors(problems);
      if (Object.keys(problems).length) {
        setError('Kiểm tra những thông tin được đánh dấu bên dưới.');
        return null;
      }
      validateFood(form);
      const id = await mutate('saveFood', form, foodId);
      const saved = { id, name: form.name.trim() };
      if (keepAdding && !editing) {
        const next = createFoodForm(null, form);
        initial.current = JSON.stringify(next);
        setForm(next);
        setSavedCount(count => count + 1);
      } else {
        initial.current = JSON.stringify(form);
      }
      setErrors({});
      setError('');
      return saved;
    } catch (err) { setError(err.message); return null; }
    finally { saving.current = false; }
  };
  return {
    form, setField, errors, error, save, busy, editing, missing,
    suggestions, chooseSuggestion, changeQuantity, savedCount,
    dirty: JSON.stringify(form) !== initial.current,
  };
}
