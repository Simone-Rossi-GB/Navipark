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


}