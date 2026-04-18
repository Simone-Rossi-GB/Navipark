<?php
namespace Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Model\UtenteRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\Validator;

class UtenteController
{
    public function __construct(private UtenteRepository $utenti) {}

    public function update(Request $request, Response $response, array $args): Response
    {
        $me = $request->getAttribute('utente');

        // Un utente può modificare solo se stesso (admin può modificare chiunque)
        if ($args['id'] !== $me['utente_id'] && $me['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }

        $body = $request->getParsedBody() ?? [];
        if (empty($body)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => ['nome', 'cognome', 'telefono']]);
        }

        $this->utenti->update($args['id'], $body);
        return JsonResponse::success($response, StatusCode::UTENTE_AGGIORNATO, $this->utenti->findById($args['id']));
    }
}