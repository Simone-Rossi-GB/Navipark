<?php

namespace Controller;

use Psr\Container\ContainerInterface;
use Slim\Psr7\Request;
use Slim\Psr7\Response;

require_once 'Model/PostoRepository.php';
use Model\PostoRepository;

class PostoController{

    private $container;

    // constructor receives container instance
    public function __construct(ContainerInterface $container)
    {
        $this->container = $container;
    }

    public function postoById(Request $request, Response $response, array $args): Response
    {
        $PostoRepository = new PostoRepository();
        $posto = $PostoRepository->getPostoById($args['id']);

        $response->getBody()->write($posto);

        return $response
            ->withHeader('Content-Type', 'application/json');
    }

    public function postoByParcheggioId(Request $request, Response $response, array $args): Response
    {
        $PostoRepository = new PostoRepository();
        $posto = $PostoRepository->getPostoByParcheggioId($args['parcheggio_id']);

        $response->getBody()->write($posto);

        return $response
            ->withHeader('Content-Type', 'application/json');
    }
}