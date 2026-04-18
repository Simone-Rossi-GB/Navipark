<?php
namespace Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Log\LoggerInterface;
use Model\PrenotazioneRepository;
use Model\ParcheggioRepository;
use Util\StatusCode;
use Util\JsonResponse;
use Util\Validator;
use Util\NanoID;

class PrenotazioneController
{
    public function __construct(
        private PrenotazioneRepository $prenotazioni,
        private ParcheggioRepository   $parcheggi,
        private LoggerInterface        $logger
    ) {}

    public function getAll(Request $request, Response $response): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        return JsonResponse::success($response, StatusCode::OK, $this->prenotazioni->findAll());
    }

    public function getById(Request $request, Response $response, array $args): Response
    {
        $me   = $request->getAttribute('utente');
        $pren = $this->prenotazioni->findById($args['id']);
        if (!$pren) return JsonResponse::error($response, StatusCode::PRENOTAZIONE_NON_TROVATA);
        if ($me['ruolo'] !== 'Admin' && $pren['utente_id'] !== $me['utente_id']) {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        return JsonResponse::success($response, StatusCode::OK, $pren);
    }

    public function getByCodice(Request $request, Response $response, array $args): Response
    {
        $pren = $this->prenotazioni->findByCodice($args['codice']);
        if (!$pren) return JsonResponse::error($response, StatusCode::PRENOTAZIONE_NON_TROVATA);
        return JsonResponse::success($response, StatusCode::OK, $pren);
    }

    public function getByUtente(Request $request, Response $response, array $args): Response
    {
        $me = $request->getAttribute('utente');
        if ($me['ruolo'] !== 'Admin' && $args['userId'] !== $me['utente_id']) {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        return JsonResponse::success($response, StatusCode::OK, $this->prenotazioni->findByUtente($args['userId']));
    }

    public function getByParcheggio(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::success($response, StatusCode::OK, $this->prenotazioni->findByParcheggio($args['id']));
    }

    public function create(Request $request, Response $response): Response
    {
        $me   = $request->getAttribute('utente');
        $body = $request->getParsedBody() ?? [];

        $mancanti = Validator::required($body, ['parcheggio_id', 'targa', 'data_ora_inizio', 'data_ora_fine']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }
        if (!Validator::targa($body['targa'])) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_TARGA_NON_VALIDA);
        }
        if (!Validator::dataRange($body['data_ora_inizio'], $body['data_ora_fine'])) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_DATE_NON_VALIDE);
        }

        $parcheggio = $this->parcheggi->findById($body['parcheggio_id']);
        if (!$parcheggio) return JsonResponse::error($response, StatusCode::PARCHEGGIO_NON_TROVATO);
        if ($parcheggio['posti_liberi'] <= 0) {
            return JsonResponse::error($response, StatusCode::PARCHEGGIO_PIENO);
        }

        $id = NanoID::generate();
        $this->prenotazioni->create([
            'id'                 => $id,
            'codice_prenotazione'=> NanoID::generate(), // generato lato server, mai dal client
            'utente_id'          => $me['utente_id'],   // dal token JWT, mai dal body
            'parcheggio_id'      => $body['parcheggio_id'],
            'parcheggio_nome'    => $parcheggio['nome'], // dal DB, mai dal body
            'targa'              => $body['targa'],
            'data_ora_inizio'    => $body['data_ora_inizio'],
            'data_ora_fine'      => $body['data_ora_fine'],
        ]);
        $this->parcheggi->decrementaPostiLiberi($body['parcheggio_id']);

        $this->logger->info('prenotazione_creata', [
            'id'           => $id,
            'user_id'      => $me['utente_id'],
            'parcheggio'   => $parcheggio['nome'],
            'data_inizio'  => $body['data_ora_inizio'],
            'data_fine'    => $body['data_ora_fine'],
        ]);

        return JsonResponse::success($response, StatusCode::PRENOTAZIONE_CREATA, $this->prenotazioni->findById($id));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $me   = $request->getAttribute('utente');
        $pren = $this->prenotazioni->findById($args['id']);
        if (!$pren) return JsonResponse::error($response, StatusCode::PRENOTAZIONE_NON_TROVATA);
        if ($me['ruolo'] !== 'Admin' && $pren['utente_id'] !== $me['utente_id']) {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        if ($pren['stato'] !== 'attiva') {
            return JsonResponse::error($response, StatusCode::PRENOTAZIONE_GIA_ANNULLATA);
        }

        $body     = $request->getParsedBody() ?? [];
        $mancanti = Validator::required($body, ['targa', 'data_ora_inizio', 'data_ora_fine']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }

        $this->prenotazioni->update($args['id'], $body);

        $this->logger->info('prenotazione_aggiornata', [
            'id'      => $args['id'],
            'user_id' => $me['utente_id'],
        ]);

        return JsonResponse::success($response, StatusCode::PRENOTAZIONE_AGGIORNATA, $this->prenotazioni->findById($args['id']));
    }

    public function cancel(Request $request, Response $response, array $args): Response
    {
        $me   = $request->getAttribute('utente');
        $pren = $this->prenotazioni->findById($args['id']);
        if (!$pren) return JsonResponse::error($response, StatusCode::PRENOTAZIONE_NON_TROVATA);
        if ($me['ruolo'] !== 'Admin' && $pren['utente_id'] !== $me['utente_id']) {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        if ($pren['stato'] !== 'attiva') {
            return JsonResponse::error($response, StatusCode::PRENOTAZIONE_GIA_ANNULLATA);
        }

        $this->prenotazioni->cancel($args['id']);
        $this->parcheggi->incrementaPostiLiberi($pren['parcheggio_id']);

        $this->logger->info('prenotazione_annullata', [
            'id'         => $args['id'],
            'user_id'    => $me['utente_id'],
            'parcheggio' => $pren['parcheggio_nome'],
        ]);

        return JsonResponse::success($response, StatusCode::PRENOTAZIONE_ANNULLATA, $this->prenotazioni->findById($args['id']));
    }

    public function getAdminStats(Request $request, Response $response): Response
    {
        if ($request->getAttribute('utente')['ruolo'] !== 'Admin') {
            return JsonResponse::error($response, StatusCode::AUTH_ACCESSO_NEGATO);
        }
        return JsonResponse::success($response, StatusCode::OK, $this->prenotazioni->getStats());
    }
}
