<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddCartItemRequest;
use App\Http\Requests\CartSummaryRequest;
use App\Http\Resources\CartDetailsResource;
use App\Http\Resources\CartItemResource;
use App\Http\Resources\CartSummaryResource;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerCartController extends Controller
{
    public function show(Request $request, CartService $service): JsonResponse
    {
        return (new CartDetailsResource($service->details($request->user())))
            ->response()
            ->header('Cache-Control', 'private, no-store');
    }

    public function store(AddCartItemRequest $request, CartService $service): JsonResponse
    {
        $data = $request->validated();
        $result = $service->add($request->user(), $data['product_variant_id'], $data['quantity']);

        return response()->json(['data' => [
            'item' => (new CartItemResource($result['item']))->resolve($request),
            'summary' => (new CartSummaryResource($result['summary']))->resolve($request),
        ]], $result['created'] ? 201 : 200);
    }

    public function summary(CartSummaryRequest $request, CartService $service): CartSummaryResource
    {
        $id = $request->validated('product_variant_id');

        return new CartSummaryResource($service->summary($request->user(), $id === null ? null : (int) $id));
    }
}
