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

  public function update(Request $request, $id) {
    $category = Category::findOrFail($id);

    $data = $request->validate([
      'CategoryName' => 'required|string|max:255',
      'CategoryDescription' => 'nullable|string',
    ]);

    $category->update([
      'CategoryName' => $data['CategoryName'],
      'CategoryDescription' => $data['CategoryDescription'] ?? $category->CategoryDescription,
      'DateModified' => now(),
    ]);

    return redirect()->back()->with('success', 'Category updated successfully.');
  }

  public function destroy($id) {
    $category = Category::findOrFail($id);

    // Check if category has products
    if ($category->products()->count() > 0) {
      return redirect()->back()->with('error', 'Cannot delete category that has products.');
    }

    $category->delete();

    return redirect()->back()->with('success', 'Category deleted successfully.');
  }
}
