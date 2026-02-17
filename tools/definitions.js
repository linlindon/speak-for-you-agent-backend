// tools/definitions.js

export const toolDefinitions = {
  functionDeclarations: [
    {
      name: 'getCurrentWeather',
      description: '查詢指定城市現在的天氣狀況，包含溫度、濕度、天氣描述等即時資訊',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名稱，例如：Taipei, Tokyo, New York, London',
          },
        },
        required: ['city'],
      },
    },
    {
      name: 'getWeatherForecast',
      description: '查詢指定城市未來最多 5 天的天氣預報，適合詢問明天、後天、這週的天氣',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名稱，例如：Taipei, Tokyo, New York, London',
          },
          days: {
            type: 'number',
            description: '要查詢幾天的預報，1 到 5 之間，預設為 5',
          },
        },
        required: ['city'],
      },
    },
  ],
};