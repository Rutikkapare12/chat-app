<?php

namespace App\Http\Requests\Chat;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreConversationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        if ($this->boolean('is_group')) {
            return [
                'name' => ['required', 'string', 'max:255'],
                'user_ids' => ['required', 'array', 'min:1'],
                'user_ids.*' => ['required', 'string', 'uuid', 'exists:users,id', 'not_in:'.$this->user()->id],
            ];
        }

        return [
            'user_id' => ['required', 'string', 'uuid', 'exists:users,id', 'not_in:'.$this->user()->id],
        ];
    }
}
