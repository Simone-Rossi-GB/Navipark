<?php
use Controller\AuthController;
use Controller\UtenteController;
use Controller\ParcheggioController;
use Controller\PrenotazioneController;
use Middleware\AuthMiddleware;
use Middleware\RateLimitMiddleware;

return function ($app, $container) {
    $auth = new AuthMiddleware(
        $container->get(\Model\SessioneRepository::class),
        $container->get('config')['JWT_SECRET']
    );

    $app->group('/auth', function ($group) use ($auth) {
        $group->post('/register', [AuthController::class, 'register']);
        $group->post('/login', [AuthController::class, 'login']);
        $group->post('/me', [AuthController::class, 'me'])->add($auth);
        $group->post('/logout', [AuthController::class, 'logout'])->add($auth);
    })->add(new RateLimitMiddleware());

    $app->get('/parcheggio', [ParcheggioController::class, 'getAll']);
    $app->get('/parcheggio/id/{id}', [ParcheggioController::class, 'getById']);
    $app->post('/parcheggio', [ParcheggioController::class, 'create'])->add($auth);
    $app->put('/parcheggio/id/{id}', [ParcheggioController::class, 'update'])->add($auth);
    $app->delete('/parcheggio/id/{id}', [ParcheggioController::class, 'delete'])->add($auth);

    $app->put('/utente/id/{id}', [UtenteController::class, 'update'])->add($auth);

    $app->get('/prenotazione', [PrenotazioneController::class, 'getAll'])->add($auth);
    $app->post('/prenotazione', [PrenotazioneController::class, 'create']);
    $app->get('/prenotazione/id/{id}', [PrenotazioneController::class, 'getById'])->add($auth);
    $app->get('/prenotazione/codice/{codice}', [PrenotazioneController::class, 'getByCodice'])->add($auth);
    $app->get('/prenotazione/utente/{userId}', [PrenotazioneController::class, 'getByUtente'])->add($auth);
    $app->get('/prenotazione/parcheggio/{id}', [PrenotazioneController::class, 'getByParcheggio'])->add($auth);
    $app->put('/prenotazione/id/{id}', [PrenotazioneController::class, 'update'])->add($auth);
    $app->patch('/prenotazione/id/{id}/annulla', [PrenotazioneController::class, 'cancel'])->add($auth);

    $app->get('/admin/stats', [PrenotazioneController::class, 'getAdminStats'])->add($auth);

    // Preflight CORS
    $app->options('/{routes:.*}', function ($req, $res) { return $res; });
};