<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

class CorsMiddleware
{
    private array $allowed = [
        'http://localhost:5173',
        'http://localhost:4173',
        'https://simoxhomenet.duckdns.org',
        'https://simoxhomenet.duckdns.org:1080',
    ];

    public function __invoke(Request $request, Handler $handler): Response
    {
        if ($request->getMethod() === 'OPTIONS') {
            return $this->addHeaders(new SlimResponse(), $request);
        }
        return $this->addHeaders($handler->handle($request), $request);
    }

    private function addHeaders(Response $response, Request $request): Response
    {
        $origin = $request->getHeaderLine('Origin');
        $allowed = in_array($origin, $this->allowed) ? $origin : $this->allowed[0];

        return $response
            ->withHeader('Access-Control-Allow-Origin', $allowed)
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            ->withHeader('Access-Control-Allow-Credentials', 'true');
    }
}
