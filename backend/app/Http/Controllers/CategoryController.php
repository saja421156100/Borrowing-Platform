<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
 * @OA\Get(
 *     path="/api/categories",
 *     tags={"Categories"},
 *     summary="Get all categories",
 *     description="Return a list of all categories.",
 *
 *     @OA\Response(
 *         response=200,
 *         description="Categories retrieved successfully"
 *     )
 * )
 */
    public function index()
    {
        $categories = Category::withCount('items')->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    /**
 * @OA\Post(
 *     path="/api/categories",
 *     tags={"Categories"},
 *     summary="Create a new category",
 *     description="Create a new category.",
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(
 *             required={"name"},
 *
 *             @OA\Property(
 *                 property="name",
 *                 type="string",
 *                 example="Electronics"
 *             ),
 *
 *             @OA\Property(
 *                 property="description",
 *                 type="string",
 *                 example="Electronic devices and accessories"
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Category created successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error"
 *     )
 * )
 */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $category = Category::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'data' => $category
        ], 201);
    }


    /**
 * @OA\Get(
 *     path="/api/categories/{id}",
 *     tags={"Categories"},
 *     summary="Get a category",
 *     description="Return a specific category.",
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Category ID",
 *         @OA\Schema(type="integer"),
 *         example=1
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Category retrieved successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Category not found"
 *     )
 * )
 */
    public function show(Category $category)
    {
        $category->load('items');

        return response()->json([
            'success' => true,
            'data' => $category
        ]);
    }



    /**
 * @OA\Put(
 *     path="/api/categories/{id}",
 *     tags={"Categories"},
 *     summary="Update a category",
 *     description="Update an existing category.",
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Category ID",
 *         @OA\Schema(type="integer"),
 *         example=1
 *     ),
 *
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(
 *             @OA\Property(
 *                 property="name",
 *                 type="string",
 *                 example="Electronics"
 *             ),
 *
 *             @OA\Property(
 *                 property="description",
 *                 type="string",
 *                 example="Electronic devices"
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Category updated successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Category not found"
 *     )
 * )
 */
    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $category->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data' => $category
        ]);
    }



    /**
 * @OA\Delete(
 *     path="/api/categories/{id}",
 *     tags={"Categories"},
 *     summary="Delete a category",
 *     description="Delete an existing category.",
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="Category ID",
 *         @OA\Schema(type="integer"),
 *         example=1
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Category deleted successfully"
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Category not found"
 *     )
 * )
 */
    public function destroy(Category $category)
    {
        if ($category->items()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'This category still contains items. Move or remove those items before deleting the category.',
            ], 409);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully'
        ]);
    }
}