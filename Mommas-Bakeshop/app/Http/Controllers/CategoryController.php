<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller {
  public function store(Request $request) {
    $data = $request->validate([
      'CategoryName' => 'required|string|max:255',
      'CategoryDescription' => 'nullable|string',
    ]);

    $category = Category::create([
      'CategoryName' => $data['CategoryName'],
      'CategoryDescription' => $data['CategoryDescription'] ?? '',
      'DateAdded' => now(),
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Category created successfully.');
  }
}
