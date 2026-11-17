<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerAddressRequest;
use App\Http\Resources\AddressResource;
use App\Services\CustomerAddressService;
use Illuminate\Http\Request;

class CustomerAddressController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->validate(['page' => ['sometimes', 'integer', 'min:1', 'max:1000000'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:50']]);

        return AddressResource::collection($request->user()->addresses()->orderByDesc('is_default')->orderByDesc('created_at')->orderByDesc('id')->paginate($query['per_page'] ?? 10)->withQueryString());
    }

    public function store(CustomerAddressRequest $request, CustomerAddressService $service)
    {
        return (new AddressResource($service->save($request->user(), $request->validated())))->response()->setStatusCode(201);
    }

    public function update(CustomerAddressRequest $request, string $address, CustomerAddressService $service)
    {
        return new AddressResource($service->save($request->user(), $request->validated(), $address));
    }

    public function destroy(Request $request, string $address, CustomerAddressService $service)
    {
        $service->delete($request->user(), $address);

        return response()->noContent();
    }

    public function makeDefault(Request $request, string $address, CustomerAddressService $service)
    {
        return new AddressResource($service->makeDefault($request->user(), $address));
    }
}
