<?php

namespace Controller;

use Psr\Container\ContainerInterface;
use Slim\Psr7\Request;
use Slim\Psr7\Response;

require_once 'Model/ParcheggioRepository.php';
use Model\ParcheggioRepository;

class UtenteController {
    private $container;

    // constructor receives container instance
    public function __construct(ContainerInterface $container)
    {
        $this->container = $container;
    }
}