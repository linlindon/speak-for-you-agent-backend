import { 
  getCurrentWeather, 
  getWeatherForecast,
  formatWeatherData,
  formatForecastData,
} from '../utils/weatherAPI.js';

export async function executeTool(name, args) {

  if (name === 'getCurrentWeather') {
    const data = await getCurrentWeather(args.city);
    return formatWeatherData(data);
  }

  if (name === 'getWeatherForecast') {
    const data = await getWeatherForecast(args.city, args.days);
    return formatForecastData(data);
  }

  throw new Error(`未知的工具：${name}`);
}