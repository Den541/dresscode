import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  async getWeather(@Query('city') city?: string) {
    if (!city?.trim()) {
      throw new BadRequestException('Query param "city" is required');
    }

    try {
      return await this.weatherService.getWeatherByCity(city.trim());
    } catch (e: any) {
      // Тут можна зробити окремо 404, але для Week 1 достатньо 400 з текстом
      throw new BadRequestException(e?.message ?? 'Failed to fetch weather');
    }
  }
}