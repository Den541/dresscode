type Weather = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitationMm: number;
  description: string;
};

export type UserPreferences = {
  style: 'CASUAL' | 'FORMAL' | 'SPORTY';
  coldSensitivity: number;
  favoriteCats?: string[];
};

export function getRecommendationUA(weather: Weather, preferences?: UserPreferences) {
  const items: string[] = [];
  const reasons: string[] = [];

  const t = typeof weather.feelsLike === 'number' ? weather.feelsLike : weather.temperature;
  const desc = (weather.description ?? '').toLowerCase();

  // Adjust temperature based on cold sensitivity
  const coldAdjustment = preferences?.coldSensitivity ?? 0;
  const adjustedTemp = t - (coldAdjustment * 2); // -5 to 5 maps to -10 to +10 degrees adjustment

  // Температура (з врахуванням cold sensitivity)
  if (adjustedTemp <= 0) {
    items.push('Зимова куртка', 'Теплий светр/худі', 'Шапка та рукавички');
    reasons.push(`Відчувається як ${t}°C (ваша чутливість: ${coldAdjustment}) — потрібні теплі шари.`);
  } else if (adjustedTemp <= 10) {
    items.push('Куртка', 'Светр/худі');
    reasons.push(`Відчувається як ${t}°C (ваша чутливість: ${coldAdjustment}) — краще одягнути куртку й теплий верх.`);
  } else if (adjustedTemp <= 18) {
    items.push('Легка куртка / кардиган');
    reasons.push(`Відчувається як ${t}°C (ваша чутливість: ${coldAdjustment}) — достатньо легкого верхнього шару.`);
  } else {
    items.push('Футболка / легкий верх');
    reasons.push(`Відчувається як ${t}°C (ваша чутливість: ${coldAdjustment}) — комфортно у легкому одязі.`);
  }

  // Style-specific recommendations
  const style = preferences?.style ?? 'CASUAL';
  if (style === 'FORMAL') {
    items.push('Жакет або формальна верхівка');
    reasons.push('Ваш стиль — FORMAL. Додай офіційну верхівку для більш ошатного вигляду.');
  } else if (style === 'SPORTY') {
    items.push('Спортивна олімпійка або спортивна куртка');
    reasons.push('Ваш стиль — SPORTY. Відмінно для активного дня!');
  } else {
    // CASUAL
    items.push('Розслаблена посадка');
    reasons.push('Ваш стиль — CASUAL. Комф та стиль чергуються.');
  }

  // Опади
  if (weather.precipitationMm > 0 || desc.includes('rain') || desc.includes('drizzle')) {
    items.push('Парасоля або дощовик');
    reasons.push('Є опади або висока ймовірність дощу — потрібен захист від води.');
  }
  if (desc.includes('snow')) {
    items.push('Непромокальне взуття');
    reasons.push('Ймовірний сніг — краще обрати взуття, яке не промокає.');
  }

  // Вітер
  if (weather.windSpeed >= 6) {
    items.push('Вітровка / шарф');
    reasons.push(`Вітер ${weather.windSpeed} м/с — варто додати захист від вітру.`);
  }

  // Взуття (завжди)
  items.push('Зручне взуття');
  reasons.push('Взуття додаємо завжди для повсякденного використання.');

  // Улюблені категорії
  if (preferences?.favoriteCats && preferences.favoriteCats.length > 0) {
    reasons.push(`Ваші улюблені категорії: ${preferences.favoriteCats.join(', ')}. Враховувалися в рекомендації.`);
  }

  // прибрати дублікати
  const uniqueItems = Array.from(new Set(items));

  // shuffle items so "Refresh" has a visible effect
  const shuffledItems = [...uniqueItems].sort(() => Math.random() - 0.5);

  return { items: shuffledItems, reasons };
}