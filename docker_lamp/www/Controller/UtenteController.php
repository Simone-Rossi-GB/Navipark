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
        $body = $request->getParsedBody() ?? [];
        if (empty($body)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => ['nome', 'cognome', 'telefono']]);
        }

        $existing = $this->utenti->findById($args['id']);
        if (!$existing) return JsonResponse::error($response, StatusCode::UTENTE_NON_TROVATO);

        $merged = array_merge([
            'nome'     => $existing['nome'],
            'cognome'  => $existing['cognome'],
            'telefono' => $existing['telefono'],
        ], $body);

        $this->utenti->update($args['id'], $merged);
        return JsonResponse::success($response, StatusCode::UTENTE_AGGIORNATO, $this->utenti->findById($args['id']));
    }
}