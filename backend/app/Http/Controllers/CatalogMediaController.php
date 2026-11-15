<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;

class CatalogMediaController extends Controller
{
    public function show(string $filename)
    {
        $disk = Storage::disk('public');
        $path = 'catalog/products/'.$filename;
        abort_unless($disk->exists($path), 404);

        return response()->file($disk->path($path), [
            'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
