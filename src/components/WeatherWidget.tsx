import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Cloud, CloudRain, Sun, Wind, Droplets } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WeatherWidgetProps {
  location: string;
  startDate: string;
}

interface Forecast {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  pop: number; // Probability of precipitation
  dt_txt: string;
}

export function WeatherWidget({ location, startDate }: WeatherWidgetProps) {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: functionError } = await supabase.functions.invoke('get-weather', {
          body: { location, startDate },
        });

        if (functionError) throw functionError;
        if (data.error) throw new Error(data.error);

        setForecasts(data.forecasts || []);
      } catch (err: any) {
        console.error('Weather fetch error:', err);
        setError(err.message || 'Failed to load weather');
      } finally {
        setLoading(false);
      }
    };

    if (location) {
      fetchWeather();
    }
  }, [location, startDate]);

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain')) return <CloudRain className="h-8 w-8 text-blue-500" />;
    if (lower.includes('cloud')) return <Cloud className="h-8 w-8 text-gray-500" />;
    return <Sun className="h-8 w-8 text-yellow-500" />;
  };

  const formatTime = (dt: number) => {
    return new Date(dt * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (forecasts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Weather Forecast for Tournament Day
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {forecasts.slice(0, 4).map((forecast) => (
            <div
              key={forecast.dt}
              className="flex flex-col items-center p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium mb-2">{formatTime(forecast.dt)}</p>
              {getWeatherIcon(forecast.weather[0].main)}
              <p className="text-2xl font-bold mt-2">{Math.round(forecast.main.temp)}°F</p>
              <p className="text-xs text-muted-foreground capitalize">
                {forecast.weather[0].description}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  <span>{Math.round(forecast.wind.speed)} mph</span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  <span>{Math.round(forecast.pop * 100)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
