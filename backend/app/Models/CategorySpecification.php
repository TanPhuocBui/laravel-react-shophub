<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class CategorySpecification extends Pivot
{
    protected $table = 'category_specification';

    protected $fillable = ['category_id', 'specification_id', 'is_required', 'sort_order'];

    protected function casts(): array
    {
        return ['is_required' => 'boolean', 'sort_order' => 'integer'];
    }
}
