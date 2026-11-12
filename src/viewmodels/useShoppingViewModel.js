import { useMemo, useRef, useState } from 'react';
import { useFridgeViewModel } from './FridgeProvider';
import { formatDate, todayISO, validateShopping } from '../models/food';
import { getShoppingFormErrors, stepQuantity, QUICK_FOODS } from '../models/foodForm';

const emptyForm = unit => ({ name: '', quantity: '1', unit: unit || 'quả' });
export default function useShoppingViewModel() {
  const { shopping, foods, busy, mutate } = useFridgeViewModel();
  const [mode, setMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm());
  const [transfer, setTransfer] = useState([]);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const initialForm = useRef('');
  const submitting = useRef(false);
  const setField = (key, value) => { setForm(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setError(''); };
  const suggestions = useMemo(() => {
    const seen = new Set();
    return [...shopping, ...foods, ...QUICK_FOODS].filter(item => {
      const key = item.name.trim().toLocaleLowerCase('vi');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8).map(item => ({ name: item.name, unit: item.unit }));
  }, [shopping, foods]);
  const chooseSuggestion = item => {
    setForm(previous => ({ ...previous, name: item.name, unit: item.unit }));
    setErrors({}); setError('');
  };
  const changeQuantity = direction => {
    setForm(previous => ({ ...previous, quantity: stepQuantity(previous.quantity, direction) }));
    setErrors(previous => ({ ...previous, quantity: undefined })); setError('');
  };
  const setTransferField = (id, key, value) => {
    setTransfer(previous => previous.map(item => item.shoppingId === id ? { ...item, [key]: value } : item));
    setError('');
  };
  const openEditor = item => {
    setEditingId(item?.id ?? null);
    const next = item ? { name: item.name, quantity: String(item.quantity), unit: item.unit } : emptyForm();
    initialForm.current = JSON.stringify(next);
    setForm(next);
    setErrors({}); setError(''); setMode('edit');
  };
  const openTransfer = id => {
    const bought = shopping.filter(item => item.bought && (id == null || item.id === id));
    if (!bought.length) return;
    setTransfer(bought.map(item => ({
      shoppingId: item.id, name: item.name, quantity: String(item.quantity), unit: item.unit,
      storageAreaId: 'cool', buyDate: formatDate(todayISO()), expDate: '',
    })));
    setError(''); setMode('transfer');
  };
  const close = () => { if (!busy && !submitting.current) { setMode(null); setError(''); } };
  const save = async (keepAdding = false) => {
    if (submitting.current || busy) return null;
    submitting.current = true;
    try {
      const problems = getShoppingFormErrors(form);
      setErrors(problems);
      if (Object.keys(problems).length) return null;
      validateShopping(form);
      await mutate('saveShopping', form, editingId);
      if (keepAdding && editingId == null) {
        const next = emptyForm(form.unit);
        initialForm.current = JSON.stringify(next);
        setForm(next);
      }
      else setMode(null);
      setErrors({}); setError('');
      return form.name.trim();
    } catch (err) { setError(err.message); return null; }
    finally { submitting.current = false; }
  };
  const move = async () => {
    if (submitting.current || busy) return 0;
    submitting.current = true;
    try { const count = await mutate('moveBoughtToFridge', { entries: transfer }); setMode(null); setError(''); return count; }
    catch (err) { setError(err.message); return 0; }
    finally { submitting.current = false; }
  };
  return {
    shopping, busy, mode, editingId, form, transfer, error, errors, setField, setTransferField,
    suggestions, chooseSuggestion, changeQuantity,
    dirty: mode === 'edit' && JSON.stringify(form) !== initialForm.current,
    openEditor, openTransfer, close, save, move,
    pending: shopping.filter(item => !item.bought),
    bought: shopping.filter(item => item.bought),
    boughtCount: shopping.filter(item => item.bought).length,
    toggle: item => mutate('setBought', item.id, !item.bought),
    remove: id => mutate('deleteShopping', id),
  };
}
