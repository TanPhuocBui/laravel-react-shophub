<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PublicProductIndexRequest;
use App\Http\Resources\PublicBrandResource;
use App\Http\Resources\PublicCategoryResource;
use App\Http\Resources\PublicProductResource;
use App\Services\PublicCatalogService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicCatalogController extends Controller
{
    public function __construct(private readonly PublicCatalogService $catalog) {}

    public function categories(): AnonymousResourceCollection
    {
        return PublicCategoryResource::collection($this->catalog->categories());
    }

    public function brands(): AnonymousResourceCollection
    {
        return PublicBrandResource::collection($this->catalog->brands());
    }

    public function products(PublicProductIndexRequest $request): AnonymousResourceCollection
    {
        return PublicProductResource::collection($this->catalog->products($request->validated()));
    }

    public function product(string $slug): PublicProductResource
    {
        return new PublicProductResource($this->catalog->product($slug));
    }
}
