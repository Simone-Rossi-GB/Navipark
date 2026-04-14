<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Psr\Log\LoggerInterface;
use Model\SessioneRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\JwtHelper;
use Slim\Psr7\Response as SlimResponse;

class AuthMiddleware
{
    public function __construct(
        private SessioneRepository $sessioni,
        private string             $jwtSecret,
        private LoggerInterface    $logger
    ) {}

    public function __invoke(Request $request, Handler $handler): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');
        $ip         = $request->getServerParams()['REMOTE_ADDR'] ?? 'unknown';
        $path       = $request->getUri()->getPath();

        if (empty($authHeader)) {
            $this->logger->warning('auth_token_mancante', ['ip' => $ip, 'path' => $path]);
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_TOKEN_MANCANTE);
        }
        if (!preg_match('/^Bearer\s+(\S+)$/', $authHeader, $matches)) {
            $this->logger->warning('auth_token_malformato', ['ip' => $ip, 'path' => $path]);
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_TOKEN_NON_VALIDO);
        }

        $token    = $matches[1];
        $utenteId = JwtHelper::verify($token, $this->jwtSecret);

        if ($utenteId === null) {
            $this->logger->warning('auth_token_scaduto', ['ip' => $ip, 'path' => $path]);
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_SESSIONE_SCADUTA);
        }

        // Controlla che la sessione esista ancora nel DB (permette logout reale)
        $sessione = $this->sessioni->findByToken($token);
        if (!$sessione) {
            $this->logger->warning('auth_sessione_non_trovata', ['ip' => $ip, 'path' => $path]);
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_TOKEN_NON_VALIDO);
        }

        // I controller leggono l'utente con: $request->getAttribute('utente')
        // Contiene: utente_id, email, nome, cognome, ruolo
        return $handler->handle($request->withAttribute('utente', $sessione));
    }
}
