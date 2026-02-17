const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * 查詢當前天氣
 */
export async function getCurrentWeather(city) {
  try {
    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_tw`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`找不到城市：${city}`);
      }
      throw new Error(`天氣 API 錯誤：${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      city: data.name,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      windSpeed: data.wind.speed,
    };
    
  } catch (error) {
    console.error('Weather API Error:', error);
    throw error;
  }
}

/**
 * 查詢未來 5 天天氣預報
 * @param {string} city - 城市名稱
 * @param {number} days - 要查幾天（1-5，預設 5）
 */
export async function getWeatherForecast(city, days = 5) {
  try {
    const url = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_tw`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`找不到城市：${city}`);
      }
      throw new Error(`天氣 API 錯誤：${response.status}`);
    }
    
    const data = await response.json();

    // /forecast 每 3 小時一筆，這裡取每天中午（12:00）的資料代表當天
    const dailyMap = new Map();

    for (const item of data.list) {
      const date = item.dt_txt.split(' ')[0];      // "2025-01-15"
      const time = item.dt_txt.split(' ')[1];      // "12:00:00"

      // 只取每天 12:00 的資料（或該天第一筆）
      if (time === '12:00:00' || !dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          temperature: Math.round(item.main.temp),
          feelsLike: Math.round(item.main.feels_like),
          humidity: item.main.humidity,
          description: item.weather[0].description,
          windSpeed: item.wind.speed,
        });
      }
    }

    // 取前 N 天
    const forecast = Array.from(dailyMap.values()).slice(0, days);

    return {
      city: data.city.name,
      forecast,
    };

  } catch (error) {
    console.error('Forecast API Error:', error);
    throw error;
  }
}

/**
 * 格式化當前天氣
 */
export function formatWeatherData(weatherData) {
  return `${weatherData.city}目前天氣：
- 天氣狀況：${weatherData.description}
- 溫度：${weatherData.temperature}°C（體感 ${weatherData.feelsLike}°C）
- 濕度：${weatherData.humidity}%
- 風速：${weatherData.windSpeed} m/s`;
}

/**
 * 格式化天氣預報
 */
export function formatForecastData(forecastData) {
  const lines = forecastData.forecast.map(day =>
    `${day.date}：${day.description}，${day.temperature}°C（體感 ${day.feelsLike}°C），濕度 ${day.humidity}%`
  );

  return `${forecastData.city} 未來天氣預報：\n${lines.join('\n')}`;
}