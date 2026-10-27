export type BiometricPeriodPreset = 'day' | 'month' | 'year' | 'custom';
export type BiometricPeriod = { preset: BiometricPeriodPreset; start: string; end: string };

const localDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const currentMonthPeriod = (): BiometricPeriod => {
  const now = new Date();
  return {
    preset: 'month',
    start: localDateValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: localDateValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const periodForPreset = (preset: Exclude<BiometricPeriodPreset, 'custom'>): BiometricPeriod => {
  const now = new Date();
  if (preset === 'day') {
    const today = localDateValue(now);
    return { preset, start: today, end: today };
  }
  if (preset === 'year') {
    return {
      preset,
      start: localDateValue(new Date(now.getFullYear(), 0, 1)),
      end: localDateValue(new Date(now.getFullYear(), 11, 31)),
    };
  }
  return currentMonthPeriod();
};

export const periodForSelection = (preset: BiometricPeriodPreset, currentValue: BiometricPeriod): BiometricPeriod =>
  preset === 'custom' ? { ...currentValue, preset } : periodForPreset(preset);
