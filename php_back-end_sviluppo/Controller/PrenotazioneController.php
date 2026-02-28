<?php

namespace Controller;

use Psr\Container\ContainerInterface;
use Slim\Psr7\Request;
use Slim\Psr7\Response;

require_once 'Model/PrenotazioneRepository.php';
use Model\PrenotazioneRepository;

class PrenotazioneController{

    private $container;

    // constructor receives container instance
    public function __construct(ContainerInterface $container)
    {
        $this->container = $container;
    }

    public function prenotazioneById(Request $request, Response $response, array $args): Response
    {
        $PrenotazioneRepository = new PrenotazioneRepository();
        $prenotazione = $PrenotazioneRepository->getPrenotazioneById($args['id']);

        $response->getBody()->write($prenotazione);

        return $response
            ->withHeader('Content-Type', 'application/json');
    }

    public function prenotazioneByDataOraInizio(Request $request, Response $response, array $args): Response
    {
        $PrenotazioneRepository = new PrenotazioneRepository();
        $prenotazione = $PrenotazioneRepository->getPrenotazioneByDataOraInizio($args['data_ora_inizio']);
        
        $response->getBody()->write($prenotazione);

        return $response
            ->withHeader('Content-Type', 'application/json');
    }

    public function prenotazioneByDataOraFine(Request $request, Response $response, array $args): Response
    {
        $engine = $this->container->get('template');
        $PrenotazioneRepository = new PrenotazioneRepository();
        $prenotazione = $PrenotazioneRepository->getPrenotazioneByDataOraFine($args['data_ora_fine']);

        $response->getBody()->write($prenotazione);

        return $response
            ->withHeader('Content-Type', 'application/json');
    }

    public function prenotazioneOccupyingDataInterval(Request $request, Response $response, array $args): Response
    {
        $engine = $this->container->get('template');
        $PrenotazioneRepository = new PrenotazioneRepository();
        $prenotazione = $PrenotazioneRepository->getPrenotazioneOccupyingDataInterval(
            $args['data_ora_inizio'],
            $args['data_ora_fine']
        );

        $response->getBody()->write($prenotazione);

        return $response
            ->withHeader('Content-Type', 'application/json');
    }
}