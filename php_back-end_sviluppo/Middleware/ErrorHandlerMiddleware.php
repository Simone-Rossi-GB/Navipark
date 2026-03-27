<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Util\StatusCode;
use Util\JsonResponse;
use Slim\Psr7\Response as SlimResponse;

class ErrorHandlerMiddleware
{
    public function __invoke(Request $request, Handler $handler): Response
    {
        try {
            return $handler->handle($request);
        } catch (\Throwable $e) {
            error_log('[ErrorHandler] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            return JsonResponse::error(new SlimResponse(), StatusCode::SERVER_ERRORE_INTERNO);
        }
    }
}