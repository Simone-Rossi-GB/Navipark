<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;

class JsonBodyParserMiddleware
{
    public function __invoke(Request $request, Handler $handler): Response
    {
        if (str_contains($request->getHeaderLine('Content-Type'), 'application/json')) {
            $body = (string) $request->getBody();
            if (!empty($body)) {
                $decoded = json_decode($body, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request = $request->withParsedBody($decoded);
                }
            }
        }
        return $handler->handle($request);
    }
}