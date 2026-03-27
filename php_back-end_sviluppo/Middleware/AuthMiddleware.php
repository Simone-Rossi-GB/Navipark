<?php
namespace Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Model\SessioneRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\JwtHelper;
use Slim\Psr7\Response as SlimResponse;

class AuthMiddleware
{
    public function __construct(
        private SessioneRepository $sessioni,
        private string             $jwtSecret
    ) {}

    public function __invoke(Request $request, Handler $handler): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (empty($authHeader)) {
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_TOKEN_MANCANTE);
        }
        if (!preg_match('/^Bearer\s+(\S+)$/', $authHeader, $matches)) {
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_TOKEN_NON_VALIDO);
        }

        $token    = $matches[1];
        $utenteId = JwtHelper::verify($token, $this->jwtSecret);

        if ($utenteId === null) {
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_SESSIONE_SCADUTA);
        }

        // Controlla che la sessione esista ancora nel DB (permette logout reale)
        $sessione = $this->sessioni->findByToken($token);
        if (!$sessione) {
            return JsonResponse::error(new SlimResponse(), StatusCode::AUTH_TOKEN_NON_VALIDO);
        }

        // I controller leggono l'utente con: $request->getAttribute('utente')
        // Contiene: utente_id, email, nome, cognome, ruolo
        return $handler->handle($request->withAttribute('utente', $sessione));
    }
}