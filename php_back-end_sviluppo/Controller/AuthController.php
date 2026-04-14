<?php
namespace Controller;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Model\UtenteRepository;
use Model\SessioneRepository;
use Psr\Log\LoggerInterface;
use Util\StatusCode;
use Util\JsonResponse;
use Util\Validator;
use Util\NanoID;
use Util\JwtHelper;

class AuthController
{
    public function __construct(
        private UtenteRepository   $utenti,
        private SessioneRepository $sessioni,
        private array              $config,
        private LoggerInterface $logger
    ) {}

    public function register(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];

        $mancanti = Validator::required($body, ['nome', 'email', 'password']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }
        if (!Validator::email($body['email'])) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_EMAIL_NON_VALIDA);
        }
        if (!Validator::password($body['password'])) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_PASSWORD_DEBOLE);
        }
        if ($this->utenti->findByEmail($body['email'])) {
            return JsonResponse::error($response, StatusCode::UTENTE_EMAIL_ESISTENTE);
        }

        $id = NanoID::generate();
        $this->utenti->create([
            'id'            => $id,
            'email'         => $body['email'],
            'password_hash' => password_hash($body['password'], PASSWORD_BCRYPT),
            'nome'          => $body['nome'],
            'cognome'       => $body['cognome'] ?? '',
            'telefono'      => $body['telefono'] ?? '',
        ]);

        $token = JwtHelper::generate($id, $this->config['JWT_SECRET'], $this->config['JWT_TTL']);
        $this->sessioni->create(NanoID::generate(), $id, $token, $this->config['JWT_TTL']);

        $this->logger->info('registrazione_ok', ['user_id' => $id]);

        return JsonResponse::success($response, StatusCode::AUTH_REGISTRAZIONE_OK, [
            'token' => $token,
            'user'  => $this->utenti->findById($id),
        ]);
    }

    public function login(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody() ?? [];

        $mancanti = Validator::required($body, ['email', 'password']);
        if (!empty($mancanti)) {
            return JsonResponse::error($response, StatusCode::VALIDAZIONE_CAMPI_MANCANTI, ['campi' => array_values($mancanti)]);
        }

        $utente = $this->utenti->findByEmail($body['email']);
        if (!$utente || !password_verify($body['password'], $utente['password_hash'])) {
            $this->logger->warning('login_fallito', ['email' => $body['email']]);
            return JsonResponse::error($response, StatusCode::AUTH_CREDENZIALI_ERRATE);
        }

        $token = JwtHelper::generate($utente['id'], $this->config['JWT_SECRET'], $this->config['JWT_TTL']);
        $this->sessioni->create(NanoID::generate(), $utente['id'], $token, $this->config['JWT_TTL']);
        $this->utenti->updateUltimoAccesso($utente['id']);

        unset($utente['password_hash']);

        $this->logger->info('login_ok', ['user_id' => $utente['id']]);

        return JsonResponse::success($response, StatusCode::AUTH_LOGIN_OK, [
            'token' => $token,
            'user'  => $utente,
        ]);
    }

    public function logout(Request $request, Response $response): Response
    {
        $token  = preg_replace('/^Bearer\s+/', '', $request->getHeaderLine('Authorization'));
        $utente = $request->getAttribute('utente');
        $this->sessioni->deleteByToken($token);
        $this->logger->info('logout_ok', ['user_id' => $utente['utente_id'] ?? 'unknown']);
        return JsonResponse::success($response, StatusCode::AUTH_LOGOUT_OK);
    }

    public function me(Request $request, Response $response): Response
    {
        // AuthMiddleware ha già verificato il token e caricato l'utente nell'attributo
        $utente = $request->getAttribute('utente');
        return JsonResponse::success($response, StatusCode::OK, ['user' => $utente]);
    }
}