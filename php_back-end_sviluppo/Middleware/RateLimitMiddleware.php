<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Psr\Log\LoggerInterface;
use Util\StatusCode;
use Util\JsonResponse;
use Slim\Psr7\Response as SlimResponse;

class RateLimitMiddleware
{
    public function __construct(
        private int               $max    = 10,  // max richieste nella finestra
        private int               $window = 60,  // finestra in secondi
        private ?LoggerInterface  $logger = null
    ) {}

    public function __invoke(Request $request, Handler $handler): Response
    {
        $ip  = $request->getServerParams()['REMOTE_ADDR'] ?? '0.0.0.0';
        $key = sys_get_temp_dir() . '/rl_' . md5($ip);

        $data = file_exists($key) ? json_decode(file_get_contents($key), true) : ['n' => 0, 't' => time()];
        if (time() - $data['t'] > $this->window) {
            $data = ['n' => 0, 't' => time()];
        }

        $data['n']++;
        file_put_contents($key, json_encode($data));

        if ($data['n'] > $this->max) {
            $this->logger?->warning('rate_limit_superato', [
                'ip'       => $ip,
                'requests' => $data['n'],
                'window'   => $this->window,
            ]);
            return JsonResponse::error(new SlimResponse(), StatusCode::SERVER_TROPPE_RICHIESTE);
        }

        return $handler->handle($request);
    }
}
