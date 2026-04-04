import { supabase } from './supabase';

export async function getAppSetting<T = string>(key: string): Promise<T | null> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return data ? (data.value as T) : null;
}

export async function setAppSetting(key: string, value: unknown): Promise<void> {
  await supabase
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' });
}

export async function getEffectiveOrderDate(): Promise<string | null> {
  return getAppSetting<string>('effective_order_date');
}
