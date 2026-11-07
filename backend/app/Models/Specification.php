<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Specification extends Model
{
    protected $fillable = ['name', 'code', 'unit', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_specification')
            ->using(CategorySpecification::class)->withPivot(['is_required', 'sort_order'])->withTimestamps();
    }

    public function productValues(): HasMany
    {
        return $this->hasMany(ProductSpecificationValue::class);
    }

    public function displayValue(string $value): string
    {
        $value = trim($value);
        $unit = trim($this->unit ?? '');
        // Existing edited values may already include a unit, with or without a space.
        $hasUnit = $unit !== '' && preg_match('/(?:^|\s|\d)'.preg_quote($unit, '/').'$/iu', $value);

        return $value === '' || $unit === '' || $hasUnit ? $value : $value.' '.$unit;
    }
}
