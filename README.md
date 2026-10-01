# JS Weather

A small vanilla JavaScript weather dashboard. The browser uses AJAX (`fetch`) to call a Laravel endpoint. Laravel keeps the Open-Meteo request on the server and returns a frontend-friendly response.

## Frontend

Serve this directory with any static server. For example:

```bash
python3 -m http.server 5500
```

Open `http://localhost:5500` after your Laravel API is running at `http://127.0.0.1:8000`.

Update `API_URL` at the top of `app.js` if your Laravel URL is different.

## Laravel API contract

In a Laravel application, add this route to `routes/api.php`:

```php
use App\Http\Controllers\WeatherController;
use Illuminate\Support\Facades\Route;

Route::get('/weather', [WeatherController::class, 'show']);
```

Create the controller with `php artisan make:controller WeatherController` and use this implementation:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WeatherController extends Controller
{
    public function show(Request $request)
    {
        $city = trim($request->query('city', ''));

        if ($city === '') {
            return response()->json(['message' => 'A city is required.'], 422);
        }

        try {
            $place = Http::get('https://geocoding-api.open-meteo.com/v1/search', [
                'name' => $city,
                'count' => 1,
                'language' => 'en',
                'format' => 'json',
            ])->throw()->json('results.0');

            if (!$place) {
                return response()->json(['message' => "We couldn't find that city."], 404);
            }

            $weather = Http::get('https://api.open-meteo.com/v1/forecast', [
                'latitude' => $place['latitude'],
                'longitude' => $place['longitude'],
                'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
                'daily' => 'weather_code,temperature_2m_max,temperature_2m_min',
                'timezone' => 'auto',
                'forecast_days' => 5,
            ])->throw()->json();

            return response()->json([
                'location' => [
                    'name' => $place['name'],
                    'country' => $place['country'] ?? '',
                    'latitude' => $place['latitude'],
                    'longitude' => $place['longitude'],
                ],
                'current' => $weather['current'],
                'daily' => $weather['daily'],
            ]);
        } catch (RequestException $exception) {
            return response()->json(['message' => 'Open-Meteo is temporarily unavailable.'], 502);
        }
    }
}
```

If the frontend is served from a different origin, allow it in Laravel's CORS configuration. The API response shape above is what `app.js` expects.
