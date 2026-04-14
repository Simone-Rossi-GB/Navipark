<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Util\StatusCode;
use Util\JsonResponse;
use Slim\Psr7\Response as SlimResponse;
use Psr\Log\LoggerInterface;

class ErrorHandlerMiddleware
{
    private LoggerInterface $logger;

    public function __construct(LoggerInterface $logger) {
        $this->logger = $logger;
    }

    public function __invoke(Request $request, Handler $handler): Response
    {
        try {
            return $handler->handle($request);
        } catch (\Throwable $e) {
            $this->logger->error('Eccezione non gestita', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'route' => $request->getUri()->getPath(),
                'method' => $request->getMethod(),
            ]);
            return JsonResponse::error(new SlimResponse(), StatusCode::SERVER_ERRORE_INTERNO);
        }
    }
}