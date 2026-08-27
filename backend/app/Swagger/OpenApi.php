<?php

namespace App\Swagger;

/**
 * @OA\Info(
 *     title="Borrowly API",
 *     version="1.0.0",
 *     description="API for Borrowly - Item Borrowing Platform"
 * )
 *
 * @OA\Server(
 *     url="http://127.0.0.1:8000",
 *     description="Local Development Server"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Enter JWT token"
 * )
 */
class OpenApi
{
}