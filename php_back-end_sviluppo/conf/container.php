<?php
use DI\ContainerBuilder;
use Util\Connection;
use Model\UtenteRepository;
use Model\ParcheggioRepository;
use Model\PrenotazioneRepository;
use Model\SessioneRepository;
use Controller\AuthController;
use Controller\UtenteController;
use Controller\ParcheggioController;
use Controller\PrenotazioneController;

$builder = new ContainerBuilder();
$builder->AddDefinitions([

    Connection::class => function ($c) {
        $config = $c->get('config');
        return Connection::getInstance($config['DB_DSN'], $config['DB_USER'], $config['DB_PWD']);
    },

    UtenteRepository::class => fn($c) => new UtenteRepository($c->get(Connection::class)),
    ParcheggioRepository::class => fn($c) => new ParcheggioRepository($c->get(Connection::class)),
    PrenotazioneRepository::class => fn($c) => new PrenotazioneRepository($c->get(Connection::class)),
    SessioneRepository::class => fn($c) => new SessioneRepository($c->get(Connection::class)),

    AuthController::class => fn($c) => new AuthController(
        $c->get(UtenteRepository::class),
        $c->get(SessioneRepository::class),
        $c->get('config')
    ),

    UtenteController::class => fn($c) => new UtenteController(
        $c->get(UtenteController::class)
    ),

    ParcheggioController::class => fn($c) => new ParcheggioController(
        $c->get(ParcheggioController::class)
    ),

    PrenotazioneController::class => fn($c) => new PrenotazioneController(
        $c->get(PrenotazioneController::class),
        $c->get(PrenotazioneRepository::class)
    ),
]);

return $builder->build();