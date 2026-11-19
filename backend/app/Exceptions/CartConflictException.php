<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CartConflictException extends HttpException
{
    public function __construct(string $message, public readonly string $reason, public readonly array $context = [])
    {
        parent::__construct(409, $message);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => $this->reason,
            'context' => (object) $this->context,
        ], 409);
    }
}
