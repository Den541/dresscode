type Weather = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitationMm: number;
  description: string;
};

export function getRecommendationUA(weather: Weather) {
  const items: string[] = [];
  const reasons: string[] = [];

  const t = typeof weather.feelsLike === 'number' ? weather.feelsLike : weather.temperature;
  const desc = (weather.description ?? '').toLowerCase();

  // Температура
  if (t <= 0) {
    items.push('Зимова куртка', 'Теплий светр/худі', 'Шапка та рукавички');
    reasons.push(`Відчувається як ${t}°C — потрібні теплі шари.`);
  } else if (t <= 10) {
    items.push('Куртка', 'Светр/худі');
    reasons.push(`Відчувається як ${t}°C — краще одягнути куртку та теплий верх.`);
  } else if (t <= 18) {
    items.push('Легка куртка / кардиган');
    reasons.push(`Відчувається як ${t}°C — достатньо легкого верхнього шару.`);
  } else {
    items.push('Футболка / легкий верх');
    reasons.push(`Відчувається як ${t}°C — комфортно у легкому одязі.`);
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

  // прибрати дублікати
    const uniqueItems = Array.from(new Set(items));

    // shuffle items so "Refresh" has a visible effect
    const shuffledItems = [...uniqueItems].sort(() => Math.random() - 0.5);

    return { items: shuffledItems, reasons };
}