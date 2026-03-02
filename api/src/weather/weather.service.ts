import { Injectable } from '@nestjs/common';

export type WeatherDto = {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitationMm: number;
  description: string;
  icon: string;
};

@Injectable()
export class WeatherService {
  async getWeatherByCity(city: string): Promise<WeatherDto> {
    const apiKey = process.env.OPENWEATHER_API_KEY;

     console.log('OW key loaded:', Boolean(process.env.OPENWEATHER_API_KEY));
     console.log('OW key length:', apiKey?.length);

    if (!apiKey) throw new Error('OPENWEATHER_API_KEY is not set');

    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?q=${encodeURIComponent(city)}` +
      `&appid=${apiKey}` +
      `&units=metric`;

    const res = await fetch(url);

    if (!res.ok) {
      // 404 city not found, etc.
      throw new Error(`OpenWeather error: ${res.status}`);
    }

    const data: any = await res.json();

    const precipitationMm =
      (data?.rain?.['1h'] ?? 0) + (data?.snow?.['1h'] ?? 0);

    return {
      city: data?.name ?? city,
      temperature: data?.main?.temp ?? 0,
      feelsLike: data?.main?.feels_like ?? 0,
      humidity: data?.main?.humidity ?? 0,
      windSpeed: data?.wind?.speed ?? 0,
      precipitationMm,
      description: data?.weather?.[0]?.description ?? '',
      icon: data?.weather?.[0]?.icon ?? '',
    };
  }
}