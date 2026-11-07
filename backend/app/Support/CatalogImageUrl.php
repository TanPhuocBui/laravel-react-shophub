<?php

namespace App\Support;

class CatalogImageUrl
{
    public static function from(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return in_array(strtolower((string) parse_url($path, PHP_URL_SCHEME)), ['http', 'https'], true) ? $path : null;
        }

        if (str_contains($path, '..') || str_contains($path, ':') || str_contains($path, '\\') || str_starts_with($path, '//')) {
            return null;
        }

        return url('/'.ltrim($path, '/'));
    }
}
