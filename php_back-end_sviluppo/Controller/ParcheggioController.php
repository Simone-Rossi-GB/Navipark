<?php
namespace Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Log\LoggerInterface;
use Model\ParcheggioRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\Validator;
use Util\NanoID;

class ParcheggioController
{
    public function __construct(
        private ParcheggioRepository $parcheggi,
        private LoggerInterface      $logger
    ) {}

    public function getAll(Request $request, Response $response): Response
    {
        return JsonResponse::success($response, StatusCode::OK, $this->parcheggi->findAll());
    }

    public function getById(Request $request, Response $response, array $args): Response
    {
        $p = $this->parcheggi->findById($args['id']);
        if (!$p) return JsonResponse::error($response, StatusCode::PARCHEGGIO_NON_TROVATO);
        return JsonResponse::success($response, StatusCode::OK, $p);
    }

    public function create(Request $request, Response $response): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }

        $body     = $request->getParsedBody() ?? [];
        $mancanti = Validator::required($body, ['nome', 'indirizzo', 'capacita_totale', 'tariffa_oraria', 'lat', 'lng']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }

        $id = NanoID::generate();
        $this->parcheggi->create(array_merge($body, ['id' => $id]));

        $this->logger->info('parcheggio_creato', [
            'id'    => $id,
            'nome'  => $body['nome'],
            'admin' => $request->getAttribute('utente')['utente_id'],
        ]);

        return JsonResponse::success($response, StatusCode::PARCHEGGIO_CREATO, $this->parcheggi->findById($id));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        if (!$this->parcheggi->findById($args['id'])) {
            return JsonResponse::error($response, StatusCode::PARCHEGGIO_NON_TROVATO);
        }

        $this->parcheggi->update($args['id'], $request->getParsedBody() ?? []);

        $this->logger->info('parcheggio_modificato', [
            'id'    => $args['id'],
            'admin' => $request->getAttribute('utente')['utente_id'],
        ]);

        return JsonResponse::success($response, StatusCode::PARCHEGGIO_AGGIORNATO, $this->parcheggi->findById($args['id']));
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        if (!$this->parcheggi->findById($args['id'])) {
            return JsonResponse::error($response, StatusCode::PARCHEGGIO_NON_TROVATO);
        }

        $this->parcheggi->delete($args['id']);

        $this->logger->info('parcheggio_eliminato', [
            'id'    => $args['id'],
            'admin' => $request->getAttribute('utente')['utente_id'],
        ]);

        return JsonResponse::success($response, StatusCode::PARCHEGGIO_ELIMINATO);
    }
}
