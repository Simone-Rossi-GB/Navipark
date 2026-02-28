<?php

namespace Controller;

use Psr\Container\ContainerInterface;
use Slim\Psr7\Request;
use Slim\Psr7\Response;

require_once 'Model/ParcheggioRepository.php';
use Model\ParcheggioRepository;

class ParcheggioController{

    private $container;

    // constructor receives container instance
    public function __construct(ContainerInterface $container)
    {
        $this->container = $container;
    }

    public function parcheggioById(Request $request, Response $response, array $args): Response
    {
        $ParcheggioRepository = new ParcheggioRepository();
        $parcheggio = $ParcheggioRepository->getParcheggioById($args['id']);

        $response->getBody()->write($parcheggio);

        return $response
            ->withHeader('Content-Type', 'application/json');
    }
}